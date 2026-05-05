# Local dev cheatsheet

**Active stack:** `fleet-api` (Express), `fleet-web` (Vite/React), `fleet-db` (MySQL).  
Full setup: [PROPOSAL-APP-README.md](./PROPOSAL-APP-README.md).

Legacy `backend/` (FastAPI), `frontend/` (old MIS), and `database/` have been **removed** from this repo.

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| Docker (optional) | MySQL on host port **3307** via root `docker-compose.yml` |
| Node.js 18+ | `fleet-api` and `fleet-web` |

---

## MySQL

```bash
docker compose up -d
# Load schema (first time / fresh DB):
docker exec -i btt-mysql mysql -uroot -pbtt-root-local-only btt_fleet < fleet-db/schema.sql
docker exec -i btt-mysql mysql -uroot -pbtt-root-local-only btt_fleet < fleet-db/migration_002_indent_serial_batches.sql
```

Configure `fleet-api/.env`: `DATABASE_URL=mysql://btt:btt@127.0.0.1:3307/btt_fleet` (adjust user/password as needed).

---

## API & web

```bash
cd fleet-api && npm install && cp .env.example .env  # edit .env
npm run seed
npm run dev   # http://127.0.0.1:4000
```

```bash
cd fleet-web && npm install && npm run dev   # http://localhost:5174
```

---

## Stop MySQL

```bash
docker compose down
```
