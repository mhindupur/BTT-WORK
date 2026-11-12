# NUCLICK Fleet (BTT)

Fleet & fuel operations for sites, vehicles, drivers, indents, and payments.

**Developer map:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

| Package | Stack |
|---------|--------|
| `fleet-db/` | MySQL 8 schema + migrations |
| `fleet-api/` | Node.js + Express + JWT |
| `fleet-web/` | React + Vite + Tailwind |

Branch to use: `cursor/btt-fleet-proposal`

---

## Local start (Mac / Linux)

Needs Docker Desktop + Node 18+.

```bash
git checkout cursor/btt-fleet-proposal && git pull
chmod +x scripts/local-up.sh scripts/local-down.sh
./scripts/local-up.sh
```

Open **http://127.0.0.1:5174/**

Stop: `./scripts/local-down.sh` (add `--all` to stop Docker MySQL).

Demo users are created by `npm run seed` in `fleet-api` (see `fleet-api/.env.example`). Do not commit real passwords into the UI.

---

## Deploy (AWS EC2)

- Step-by-step: [docs/AWS-EC2-DEPLOY.md](./docs/AWS-EC2-DEPLOY.md)
- Ops notes: [docs/AWS-EC2-RUNBOOK.md](./docs/AWS-EC2-RUNBOOK.md)

**Important:** build and run under the same path Nginx serves (often `/opt/btt/BTT-WORK`), not only `~/BTT-WORK`.

---

## Docs index

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Folder layout + roles + request flow |
| [AWS-EC2-DEPLOY.md](./docs/AWS-EC2-DEPLOY.md) | Production install |
| [AWS-EC2-RUNBOOK.md](./docs/AWS-EC2-RUNBOOK.md) | Troubleshooting on EC2 |
| [LOCAL-DEV-CHEATSHEET.md](./docs/LOCAL-DEV-CHEATSHEET.md) | Short local commands |
