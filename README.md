# Run BTT Fleet on YOUR Mac (not cloud)

The cloud agent VM is separate from your laptop. To use `http://127.0.0.1:5174/` in your browser, start the stack **on your machine**.

## One-command local start

**Needs:** Docker Desktop (running) + Node.js 18+

```bash
git fetch origin
git checkout cursor/btt-fleet-proposal
git pull origin cursor/btt-fleet-proposal

chmod +x scripts/local-up.sh scripts/local-down.sh
./scripts/local-up.sh
```

Then open: **http://127.0.0.1:5174/**

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@btt.fleet` | `Admin@123` |
| Site manager | `supervisor@btt.fleet` | `Supervisor@123` |

Stop:

```bash
./scripts/local-down.sh        # API + web only
./scripts/local-down.sh --all  # also stop Docker MySQL
```

## What local-up does

1. Starts MySQL in Docker on **port 3308** (`docker-compose.fleet.yml`)
2. Loads `fleet-db/schema.sql` + migrations
3. Sets `fleet-api/.env` → `DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet`
4. `npm install` + seed
5. Starts API on **4000** and Vite on **5174**

Logs: `.local-run/api.log`, `.local-run/web.log`

## Manual (two terminals)

```bash
docker compose -f docker-compose.fleet.yml up -d
# wait, then load schema (see docs/PROPOSAL-APP-README.md)

cd fleet-api && cp -n .env.example .env
# DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet
npm install && npm run seed && npm run dev

cd fleet-web && npm install && npm run dev
```

More detail: [docs/PROPOSAL-APP-README.md](./docs/PROPOSAL-APP-README.md) · [docs/LOCAL-DEV-CHEATSHEET.md](./docs/LOCAL-DEV-CHEATSHEET.md)

## Deploy on AWS EC2

Step-by-step (MySQL + API + Frontend + Nginx): **[docs/AWS-EC2-DEPLOY.md](./docs/AWS-EC2-DEPLOY.md)**
