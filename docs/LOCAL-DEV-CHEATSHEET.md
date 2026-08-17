# Local dev cheatsheet (YOUR Mac / laptop)

**Important:** The Cursor cloud agent runs in a remote VM. Opening `http://127.0.0.1:5174` on your Mac only works if you start the app **locally** (or use Cursor Ports forwarding). Prefer local:

```bash
./scripts/local-up.sh
```

See root [README.md](../README.md).

**Active stack:** `fleet-api` (Express), `fleet-web` (Vite/React), `fleet-db` (MySQL).  
Full setup: [PROPOSAL-APP-README.md](./PROPOSAL-APP-README.md).

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| Docker Desktop | MySQL on host port **3308** via `docker-compose.fleet.yml` |
| Node.js 18+ | `fleet-api` and `fleet-web` |

---

## Quick start

```bash
./scripts/local-up.sh
# Web http://127.0.0.1:5174/   API http://127.0.0.1:4000/
./scripts/local-down.sh --all   # when finished
```

---

## MySQL only

```bash
docker compose -f docker-compose.fleet.yml up -d
docker exec -i btt-fleet-mysql mysql -uroot -pbtt-fleet-root-local btt_fleet < fleet-db/schema.sql
```

`fleet-api/.env`: `DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet`

---

## API & web (manual)

```bash
cd fleet-api && npm install && npm run seed && npm run dev   # :4000
cd fleet-web && npm install && npm run dev                   # :5174
```

Demo: `admin@btt.fleet` / `Admin@123` · `supervisor@btt.fleet` / `Supervisor@123`
