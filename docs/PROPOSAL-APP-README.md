# BTT Fleet & Fuel Management — final app (from `BTT_Proposal_New.pptx`)

**Branch:** `cursor/btt-fleet-proposal`  
This is the **proposal-aligned** codebase. Legacy `backend/` / `frontend/` / `database/` have been **removed**; only the paths in the table below are maintained.

| Layer | Path | Stack |
|--------|------|--------|
| SQL | `fleet-db/` | MySQL 8 |
| API | `fleet-api/` | Node.js + Express, JWT, Multer, xlsx |
| UI | `fleet-web/` | React + Vite + Tailwind |

---

## Demo logins (after `npm run seed`)

| Role | Email | Password |
|------|--------|----------|
| **Admin** | `admin@btt.fleet` | `Admin@123` |
| **Supervisor / Site manager** | `supervisor@btt.fleet` | `Supervisor@123` |

Seed also creates: demo **client**, **vehicle** `KA-01-AB-1234`, and assigns it to the supervisor so **Issue indent** works immediately.

Override via `fleet-api/.env`: `ADMIN_*`, `DEMO_SM_EMAIL`, `DEMO_SM_PASSWORD`.

---

## 1. Database

**Option A — use existing MySQL (e.g. port 3307)**

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p < fleet-db/init-database.sql
mysql -h 127.0.0.1 -P 3307 -u root -p btt_fleet < fleet-db/schema.sql
mysql -h 127.0.0.1 -P 3307 -u root -p btt_fleet < fleet-db/migration_002_indent_serial_batches.sql
```

**Existing database?** If you already had `btt_fleet` before indent-series support, apply only the migration file above (safe to re-run: `CREATE TABLE IF NOT EXISTS`).

Create app user if needed:

```sql
CREATE USER IF NOT EXISTS 'btt'@'%' IDENTIFIED BY 'btt';
GRANT ALL ON btt_fleet.* TO 'btt'@'%';
FLUSH PRIVILEGES;
```

**Option B — Docker only for this app** (port **3308**)

```bash
docker compose -f docker-compose.fleet.yml up -d
# wait ~20s, then:
mysql -h 127.0.0.1 -P 3308 -u root -pbtt-fleet-root-local < fleet-db/init-database.sql
mysql -h 127.0.0.1 -P 3308 -u root -pbtt-fleet-root-local btt_fleet < fleet-db/schema.sql
mysql -h 127.0.0.1 -P 3308 -u root -pbtt-fleet-root-local btt_fleet < fleet-db/migration_002_indent_serial_batches.sql
```

Grant `btt` on `btt_fleet` as above, then set `DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet` in `fleet-api/.env`.

---

## 2. API

```bash
cd fleet-api
cp .env.example .env
# Edit DATABASE_URL to match your MySQL host/port/DB
npm install
npm run seed
npm run dev
```

- Health: http://127.0.0.1:4000/api/health  

---

## 3. Web

```bash
cd fleet-web
npm install
npm run dev
```

- App: **http://localhost:5174/**  
- Owner payment page: **http://localhost:5174/pay/{token}** (token from Admin → Payments after Excel upload).

The Vite dev server proxies `/api` → `http://127.0.0.1:4000`; a production build needs the same `/api` reverse-proxy to `fleet-api`.

**AWS EC2 production install (FE + BE + MySQL + Nginx):** see [AWS-EC2-DEPLOY.md](./AWS-EC2-DEPLOY.md).

**AWS EC2 operations runbook** (install + issues faced + fixes): see [AWS-EC2-RUNBOOK.md](./AWS-EC2-RUNBOOK.md).

---

## Proposal coverage (summary)

- **Admin:** clients, site managers, vehicles, indents, **Indent series** (assign serial ranges like CBL0001–CBL0100 to a site manager), fuel recon (Excel), payments (Excel + WhatsApp **stub**), dashboard + mismatch alerts.  
- **Site manager:** issue indent (serial from **admin-issued pool** only, amount, photo), **30-day vehicle indent history** safeguard, my indents.  
- **Vehicle owner:** magic link payment breakdown + **viewed** timestamp + query to accounts.  

WhatsApp: replace `fleet-api/src/services/whatsapp.js` with Twilio/Meta integration.

---

## AWS / S3

Not implemented; indent images are local under `fleet-api/uploads/`. For production, use S3 + CloudFront and store object keys in `indents.image_path`.
