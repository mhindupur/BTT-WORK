#!/usr/bin/env bash
# Start BTT Fleet end-to-end on YOUR machine (Mac/Linux) — not the cloud VM.
# Requires: Docker Desktop, Node.js 18+
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required tool: $1"
    exit 1
  }
}

need docker
need node
need npm

echo "==> 1/5 MySQL via Docker (host port 3308)"
docker compose -f docker-compose.fleet.yml up -d

echo "==> Waiting for MySQL to be healthy..."
ok=0
for _ in $(seq 1 60); do
  if docker exec btt-fleet-mysql mysqladmin ping -h 127.0.0.1 -uroot -pbtt-fleet-root-local --silent 2>/dev/null; then
    ok=1
    break
  fi
  sleep 1
done
if [[ "$ok" != "1" ]]; then
  echo "MySQL did not become ready. Check: docker logs btt-fleet-mysql"
  exit 1
fi

echo "==> 2/5 Load schema + migrations (first time only if empty)"
docker exec -i btt-fleet-mysql mysql -uroot -pbtt-fleet-root-local -e "CREATE DATABASE IF NOT EXISTS btt_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
TABLES="$(docker exec btt-fleet-mysql mysql -uroot -pbtt-fleet-root-local -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='btt_fleet';" 2>/dev/null | tr -d '\r' || echo 0)"
if [[ "${TABLES:-0}" == "0" ]]; then
  echo "    Fresh DB — applying schema.sql"
  docker exec -i btt-fleet-mysql mysql -uroot -pbtt-fleet-root-local btt_fleet < fleet-db/schema.sql
else
  echo "    Existing DB ($TABLES tables) — applying additive migrations only"
fi
for m in fleet-db/migration_002_indent_serial_batches.sql fleet-db/migration_003_password_reset_otps.sql fleet-db/migration_004_vehicle_approval.sql fleet-db/migration_005_vehicle_types.sql fleet-db/migration_006_vehicle_fleetbook_fields.sql; do
  if [[ -f "$m" ]]; then
    docker exec -i btt-fleet-mysql mysql -uroot -pbtt-fleet-root-local btt_fleet < "$m" || true
  fi
done

echo "==> 3/5 Configure fleet-api/.env for local Docker MySQL"
if [[ ! -f fleet-api/.env ]]; then
  cp fleet-api/.env.example fleet-api/.env
fi
# Point API at local Docker MySQL on 3308 (fleet compose)
if grep -q '^DATABASE_URL=' fleet-api/.env; then
  sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet|' fleet-api/.env
  rm -f fleet-api/.env.bak
else
  echo 'DATABASE_URL=mysql://btt:btt@127.0.0.1:3308/btt_fleet' >> fleet-api/.env
fi

echo "==> 4/5 Install deps + seed demo users"
(cd fleet-api && npm install && npm run seed)
(cd fleet-web && npm install)

echo "==> 5/5 Start API (4000) + Web (5174)"
mkdir -p .local-run
# stop previous local-run pids if any
if [[ -f .local-run/api.pid ]]; then kill "$(cat .local-run/api.pid)" 2>/dev/null || true; fi
if [[ -f .local-run/web.pid ]]; then kill "$(cat .local-run/web.pid)" 2>/dev/null || true; fi

(cd fleet-api && npm run dev > "$ROOT/.local-run/api.log" 2>&1 & echo $! > "$ROOT/.local-run/api.pid")
(cd fleet-web && npm run dev -- --host 127.0.0.1 --port 5174 > "$ROOT/.local-run/web.log" 2>&1 & echo $! > "$ROOT/.local-run/web.pid")

sleep 2
echo
echo "============================================"
echo " Local app should be running on YOUR machine"
echo "  Web:  http://127.0.0.1:5174/"
echo "  API:  http://127.0.0.1:4000/"
echo
echo " Demo logins:"
echo "  Admin:       admin@btt.fleet / Admin@123"
echo "  Site manager: supervisor@btt.fleet / Supervisor@123"
echo
echo " Logs:  .local-run/api.log  .local-run/web.log"
echo " Stop:  ./scripts/local-down.sh"
echo "============================================"
