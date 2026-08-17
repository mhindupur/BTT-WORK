#!/usr/bin/env bash
# Keep BTT Fleet API + Web running with PM2 (auto-restart on crash).
# This is the reliable way on the cloud VM — one-shot `node`/`vite`
# processes die when agent shells exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/.local-run" "$ROOT/.tools"

PM2="$ROOT/.tools/node_modules/.bin/pm2"
if [[ ! -x "$PM2" ]]; then
  echo "Installing local pm2..."
  (cd "$ROOT/.tools" && npm init -y >/dev/null 2>&1 && npm install pm2@latest --silent)
fi

# MySQL
if command -v mysqladmin >/dev/null 2>&1; then
  mysqladmin ping -h 127.0.0.1 -ubtt -pbtt --silent 2>/dev/null || {
    sudo service mysql start 2>/dev/null || sudo systemctl start mysql 2>/dev/null || true
    sleep 2
  }
fi

# Ensure deps
[[ -d "$ROOT/fleet-api/node_modules" ]] || (cd "$ROOT/fleet-api" && npm install --silent)
[[ -d "$ROOT/fleet-web/node_modules" ]] || (cd "$ROOT/fleet-web" && npm install --silent)

# Stop competing one-shot processes (do not kill pm2 itself)
pkill -f '[n]ode src/index.js' 2>/dev/null || true
# only kill vite not managed by pm2 — best effort
sleep 1

# Start or restart under PM2
if "$PM2" describe btt-fleet-api >/dev/null 2>&1; then
  "$PM2" restart btt-fleet-api --update-env
else
  "$PM2" start "$ROOT/fleet-api/src/index.js" \
    --name btt-fleet-api \
    --cwd "$ROOT/fleet-api" \
    --time \
    --max-restarts 100 \
    --restart-delay 2000
fi

if "$PM2" describe btt-fleet-web >/dev/null 2>&1; then
  "$PM2" restart btt-fleet-web --update-env
else
  "$PM2" start npm \
    --name btt-fleet-web \
    --cwd "$ROOT/fleet-web" \
    --time \
    --max-restarts 100 \
    --restart-delay 2000 \
    -- run dev -- --host :: --port 5174
fi

"$PM2" save >/dev/null 2>&1 || true

sleep 2
echo
"$PM2" list
echo
curl -s -o /dev/null -w "API health: %{http_code}\n" http://127.0.0.1:4000/api/health || echo "API health: down"
curl -s -o /dev/null -w "Web health: %{http_code}\n" http://127.0.0.1:5174/ || echo "Web health: down"
echo
echo "============================================"
echo " Web:  http://127.0.0.1:5174/   (Cursor Ports → 5174)"
echo " API:  http://127.0.0.1:4000/"
echo " Logs: $PM2 logs"
echo " Status: $PM2 list"
echo " Stop: $PM2 stop all"
echo "============================================"
