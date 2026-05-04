# Local dev cheatsheet — MySQL, backend, frontend

Quick steps to run **Basaveshwara Tours & Travels (BTT)** on your machine.

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| **Docker Desktop** (or Docker Engine) | MySQL in a container |
| **Python 3.11+** (3.13 OK) | FastAPI backend |
| **Node.js 18+** | React (Vite) frontend |

Repo root = folder that contains `docker-compose.yml`, `backend/`, `frontend/`.

---

## 1. MySQL (Docker)

From the **repo root**:

```bash
docker compose up -d
```

Wait until healthy (about 15–30s), then **create tables** (first run, or after `docker compose down` without a volume):

```bash
docker compose exec -T mysql mysql -uroot -pbtt-root-local-only btt < database/schema.sql
```

### Connection summary

| Item | Value |
|------|--------|
| Host | `127.0.0.1` |
| Port | **`3307`** (host → container `3306`; avoids clash with Mac MySQL on `3306`) |
| Database | `btt` |
| App user | `btt` / `btt` |
| Root (admin / fixes) | `root` / `btt-root-local-only` |

**CLI example:**

```bash
mysql -h 127.0.0.1 -P 3307 -u btt -p btt
# password: btt
```

**Stop DB (optional):**

```bash
docker compose down
```

---

## 2. Backend (FastAPI)

```bash
cd backend
cp -n .env.example .env    # skip if .env already exists
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

| URL | Use |
|-----|-----|
| API health | http://127.0.0.1:8000/api/health |
| Swagger UI | http://127.0.0.1:8000/docs |

**Important:** Use **`--reload`** in dev so code changes apply without a manual restart.

`.env` must match Docker MySQL, e.g.:

`DATABASE_URL=mysql+pymysql://btt:btt@127.0.0.1:3307/btt`

---

## 3. Frontend (React + Vite)

**New terminal** (keep backend running):

```bash
cd frontend
npm install
npm run dev
```

| URL | Use |
|-----|-----|
| App | http://localhost:5173/ |

Vite proxies **`/api`** → `http://127.0.0.1:8000`, so the browser calls the same origin for API routes.

---

## 4. Default admin login

Use the **login** page:

| Field | Default (from `.env` / `config`) |
|--------|----------------------------------|
| Email | `admin@btt.local` |
| Password | `Admin@123` |

Override in `backend/.env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

---

## 5. One-page order (copy-paste)

```bash
# Terminal 1 — DB
cd /path/to/BTT-work-flow
docker compose up -d
sleep 20
docker compose exec -T mysql mysql -uroot -pbtt-root-local-only btt < database/schema.sql

# Terminal 2 — API
cd /path/to/BTT-work-flow/backend
cp -n .env.example .env
source .venv/bin/activate  # or create venv + pip install first
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 3 — UI
cd /path/to/BTT-work-flow/frontend
npm install
npm run dev
```

Then open **http://localhost:5173/** and sign in as admin.

---

## 6. Troubleshooting

| Problem | What to check |
|---------|----------------|
| `Access denied` for DB / API won’t start | App must use port **`3307`**, not `3306`, if another MySQL uses `3306`. |
| Login 422 on `admin@btt.local` | Restart API; use **`--reload`**; ensure `LoginRequest` is not using strict `EmailStr` only (see latest `backend/app/schemas/auth.py`). |
| Frontend can’t reach API | Backend on **8000**? Use **http://localhost:5173** (proxy). |
| Empty DB after `docker compose down` | Compose has no named volume → data is in-container. Re-run **schema.sql** after a fresh `up`. |

---

## 7. More detail

See **`docs/WORKFLOW.md`** for architecture, APIs, and product flows.
