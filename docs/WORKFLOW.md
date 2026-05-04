# Basaveshwara Tours and Travels (BTT) — System Workflow

Stack: **React (Vite)** · **FastAPI + OpenAPI/Swagger** · **MySQL**

This document ties together **roles**, **screens**, **APIs**, **notifications**, and **background jobs**.

---

## 1. Roles and authentication


| Role       | Login URL (suggested)                     | Notes                                                                      |
| ---------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| **Admin**  | `/login` (type=admin) or `/admin/login`   | Fixed or seeded credentials in MVP; later move to DB + bcrypt.             |
| **Client** | `/login` (type=client) or `/client/login` | Created by admin; first login after email verify + forced password change. |


**JWT** (recommended): short-lived access token + optional refresh; claims include `sub` (user id), `role`, `client_id` (for clients).

**First-time client flow**

1. Admin creates client → backend creates `users` row (`role=client`, `password_must_change=true`) + `clients` row + verification token.
2. Email: welcome + link `GET /verify-email?token=...` (frontend calls `POST /api/auth/verify-email`).
3. User sets new password via `POST /api/auth/set-password` (requires valid verify token or logged-in with must-change flag).
4. Redirect to client dashboard.

---

## 2. High-level architecture

```mermaid
flowchart LR
  subgraph fe[React SPA]
    A[Admin shell]
    C[Client shell]
    P[Public driver payment page]
  end
  subgraph api[FastAPI]
    Auth[/auth]
    Admin[/admin/*]
    Client[/client/*]
    Public[/public/payments/*]
  end
  subgraph data[MySQL]
    DB[(Schema)]
  end
  subgraph ext[Integrations]
    Mail[SMTP / SendGrid]
    WA[WhatsApp Business API]
    Cron[Scheduler / Celery beat]
  end
  A --> Auth
  A --> Admin
  C --> Auth
  C --> Client
  P --> Public
  Auth --> DB
  Admin --> DB
  Client --> DB
  Public --> DB
  Admin --> Mail
  Admin --> WA
  Client --> Mail
  Cron --> Mail
  Cron --> DB
```



---

## 3. Service 1 — Client management (Admin)

### 3.1 Admin UI (React)


| Route                     | Purpose                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/clients`          | Search/list: company name, contact, phone; actions: edit, reset password, resend invite.                                           |
| `/admin/clients/new`      | Create client form: company name, email, mobile, contracting person first/last name, optional fields (office, address, GST, etc.). |
| `/admin/clients/:id/edit` | Same fields, update.                                                                                                               |


**Components:** `ClientTable`, `ClientForm`, `ConfirmResetPasswordModal`.

### 3.2 APIs (FastAPI — prefix `/api`)


| Method  | Path                                        | Auth  | Description                                                                             |
| ------- | ------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `GET`   | `/admin/clients`                            | Admin | Query params: `q`, `page`, `page_size`.                                                 |
| `GET`   | `/admin/clients/{client_id}`                | Admin | Full client + linked user flags.                                                        |
| `POST`  | `/admin/clients`                            | Admin | Create user + client; enqueue welcome + verify email.                                   |
| `PATCH` | `/admin/clients/{client_id}`                | Admin | Update profile fields.                                                                  |
| `POST`  | `/admin/clients/{client_id}/reset-password` | Admin | Issue temp password or reset token; email client; optional `password_must_change=true`. |
| `POST`  | `/admin/clients/{client_id}/resend-invite`  | Admin | Resend verification / welcome.                                                          |


**Auth (client onboarding)**


| Method | Path                                  | Auth   | Description                                                         |
| ------ | ------------------------------------- | ------ | ------------------------------------------------------------------- |
| `POST` | `/api/auth/login`                     | None   | Returns JWT; `password_must_change` until first change.             |
| `POST` | `/api/auth/verify-email`              | None   | Body: `token` — marks email verified (consumes verification token). |
| `POST` | `/api/auth/change-temporary-password` | Bearer | After login with temp password; clears `password_must_change`.      |


**Email content (welcome):** company branded welcome, link to frontend verify route with token, note that password must be changed on first login.

---

## 4. Service 2 — Account management (Excel → WhatsApp → driver portal)

### 4.1 Flow

1. Admin uploads `.xlsx` (multipart). Backend validates columns, parses rows, stores **batch** + **line items** (per vehicle/driver/period).
2. For each row (or each unique phone), generate a **signed opaque token** (or UUID in DB) representing “this driver’s statement for this batch/period.”
3. Send **WhatsApp** message with short URL, e.g. `https://app.btt.example/pay/{token}` (public, no login).
4. Driver opens link → React **public** page loads payment breakdown (trips, fuel advance, EMI, other advances, net payable, period).
5. Driver submits **query** (text + optional attachment later) → stored with `batch_id` + `line_id`; **notify admin/account team** (email + optional in-app).

### 4.2 Admin UI


| Route                         | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `/admin/accounts/upload`      | File input, “Process upload”, show parse summary (rows ok / failed).   |
| `/admin/accounts/batches`     | List uploads with date, row count, status.                             |
| `/admin/accounts/batches/:id` | Preview table + per-row WhatsApp status + link to open public preview. |


### 4.3 APIs


| Method | Path                                                   | Auth  | Description                                                   |
| ------ | ------------------------------------------------------ | ----- | ------------------------------------------------------------- |
| `POST` | `/admin/accounts/uploads`                              | Admin | `multipart/form-data` file; returns `batch_id`, parse report. |
| `GET`  | `/admin/accounts/batches`                              | Admin | List batches.                                                 |
| `GET`  | `/admin/accounts/batches/{batch_id}`                   | Admin | Rows + query counts + dispatch status.                        |
| `POST` | `/admin/accounts/batches/{batch_id}/dispatch-whatsapp` | Admin | Triggers WA send for all pending rows (or selected).          |


**Public (driver)**


| Method | Path                               | Auth | Description                                                                       |
| ------ | ---------------------------------- | ---- | --------------------------------------------------------------------------------- |
| `GET`  | `/public/payments/{token}`         | None | Returns sanitized payment JSON for that token only.                               |
| `POST` | `/public/payments/{token}/queries` | None | Body: `message`, optional `contact_phone` confirmation. Rate-limit by IP + token. |


**WhatsApp:** integrate **Meta WhatsApp Cloud API** (or BSP). Backend holds `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`; template messages often required for outbound — align copy with approved templates.

---

## 5. Service 3 — MIS requests (Admin + Client)

### 5.1 States

`pending` → `assigned` → `completed` (optional: `cancelled`).

### 5.2 Client UI


| Route             | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/client`         | Dashboard: table of MIS history (MIS id, date, status).                                                                             |
| `/client/mis/new` | Modal or full page: request title, duty start, trip end, trip type, vehicle type, reporting time & place, destination/drop, submit. |


### 5.3 Admin UI


| Route            | Purpose                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `/admin/mis`     | Table: MIS id, date, passenger name, client, status, actions.                                              |
| `/admin/mis/:id` | Detail + **Assign** modal: pick vehicle + driver from master data (or free-text if masters not built yet). |


### 5.4 APIs

**Client**


| Method | Path                   | Auth   | Description                            |
| ------ | ---------------------- | ------ | -------------------------------------- |
| `GET`  | `/client/mis-requests` | Client | Own requests only.                     |
| `POST` | `/client/mis-requests` | Client | Create; status `pending`; email admin. |


**Admin**


| Method  | Path                              | Auth  | Description                                                                                                           |
| ------- | --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/admin/mis-requests`             | Admin | Filters: status, date range, client.                                                                                  |
| `GET`   | `/admin/mis-requests/{id}`        | Admin | Full detail.                                                                                                          |
| `POST`  | `/admin/mis-requests/{id}/assign` | Admin | Body: `vehicle_id` or vehicle fields, `driver_id` or driver fields; status → `assigned`. Triggers emails (see below). |
| `PATCH` | `/admin/mis-requests/{id}/status` | Admin | e.g. mark `completed`.                                                                                                |


### 5.5 Email rules (per your spec)


| Recipient                    | When               | Content                                                                                                                      |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **BTT Admin**                | Client creates MIS | New request summary + link to admin console.                                                                                 |
| **Client (company contact)** | Assignment         | MIS assigned; include **driver name, vehicle, contact** as approved for ops.                                                 |
| **Passenger / customer**     | Assignment         | Trip assigned confirmation **without** vehicle and driver PII (time/place/reference only, or generic “details will follow”). |


### 5.6 Cron / scheduled job (“2 hours before”)

- **Job:** For each `assigned` MIS where `reporting_time` is in T+2h window and `passenger_details_sent_at` is null:
  - Send passenger (and/or client) SMS/email with final driver/vehicle contact **if** business rules say PII only after this window — *your wireframe says share with passenger at least 2h before via cron to avoid confusion*; implement as: store `reporting_at`, run every 15 min, send once when `now >= reporting_at - 2h`.
- **Implementation:** Celery + Redis, or APScheduler inside worker, or external cron hitting `POST /internal/jobs/mis-reminders` (secured by secret).

---

## 6. Frontend structure (React)

Suggested layout:

```
src/
  api/              # axios/fetch clients, auth header injection
  routes/
    AdminLayout.tsx
    ClientLayout.tsx
    PublicLayout.tsx
  pages/
    admin/ClientsList.tsx, ClientForm.tsx, AccountsUpload.tsx, MisList.tsx, MisDetail.tsx
    client/Dashboard.tsx, MisNew.tsx
    public/DriverPayment.tsx
  components/       # tables, modals, status badges
  auth/             # AuthProvider, ProtectedRoute by role
```

**Env:** `VITE_API_BASE_URL=https://api.btt.example`

---

## 7. Backend structure (FastAPI)

```
app/
  main.py                 # app, CORS, include_router
  config.py               # settings from env
  database.py             # SQLAlchemy session
  models/                 # ORM tables
  schemas/                # Pydantic request/response
  routers/
    auth.py
    admin_clients.py
    admin_accounts.py
    admin_mis.py
    client_mis.py
    public_payments.py
  services/
    email.py
    whatsapp.py
    excel_import.py
  deps.py                 # get_current_admin, get_current_client
```

**Swagger:** auto at `/docs` and `/redoc`.

---

## 8. MySQL — core entities (logical)

- **users** — id, email, password_hash, role (`admin`|`client`), email_verified_at, password_must_change.
- **clients** — id, user_id (unique), company_name, phone, contracting_first_name, contracting_last_name, metadata JSON.
- **email_verification_tokens** — user_id, token_hash, expires_at, consumed_at.
- **payment_batches** — id, uploaded_by, filename, period_label, status, created_at.
- **payment_lines** — batch_id, vehicle_number, driver_name, driver_phone, trips, fuel_advance, emi, other_advance, net_amount, public_token, whatsapp_sent_at.
- **payment_queries** — line_id or batch_id, message, status, created_at.
- **mis_requests** — id, client_id, title, duty_start, trip_end, trip_type, vehicle_type, reporting_time_place, destination, passenger_name, passenger_email, status, assigned_vehicle, assigned_driver, reporting_at (datetime for cron).
- **audit_logs** (optional) — who changed what.

Indexes on foreign keys, `mis_requests(status, reporting_at)`, `payment_lines(public_token)` unique.

---

## 9. Security checklist (short)

- Hash passwords with **bcrypt/argon2**; never store plaintext.
- Admin bootstrap credentials via **environment variables** in dev only; production: DB admin + rotation.
- JWT in **httpOnly** cookie (preferred) or Authorization header + XSS hardening.
- Public payment tokens: **unguessable**, single-scope, optional expiry.
- Rate-limit public query POST and login.
- Validate Excel server-side; cap file size; scan for formula injection if opening in Excel on server.

---

## 10. Implementation phases

1. **Phase 1:** Auth (admin + client), client CRUD, email verify + forced password change, MIS CRUD + admin assign + basic emails (logged or SMTP).
2. **Phase 2:** Excel import, payment lines, public driver page, WhatsApp dispatch, queries + admin notification.
3. **Phase 3:** MIS cron (2h rule), templates, reporting, attachments, full audit.

The repository scaffold under `backend/` and `frontend/` matches Phase 1 boundaries so you can grow into 2 and 3 without rework.

---

## 11. Local run (scaffold)

1. **MySQL (Docker, recommended):** from the repo root run `docker compose up -d`. The compose file maps **host port 3307 → container 3306** so it does not clash with an existing MySQL on `localhost:3306`. Load schema: `docker compose exec -T mysql mysql -uroot -pbtt-root-local-only btt < database/schema.sql`. Set `DATABASE_URL` in `backend/.env` to `mysql+pymysql://btt:btt@127.0.0.1:3307/btt` (matches defaults in `backend/app/config.py`). **Alternatively**, use your own MySQL on any port and adjust `DATABASE_URL` accordingly.
2. **Backend:** `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - Swagger: `http://127.0.0.1:8000/docs`
  - Default admin (from env defaults): `admin@btt.local` / `Admin@123`
3. **Frontend:** `cd frontend && npm install && npm run dev` → `http://127.0.0.1:5173` (Vite proxies `/api` to port 8000).
4. **Driver payment link:** after upload, open `GET /api/admin/accounts/batches/{id}/lines` in Swagger for `public_token`, then visit `/pay/{token}` on the frontend.

