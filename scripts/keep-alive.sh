#!/usr/bin/env bash
# Keep BTT Fleet API + Web running on the cloud/dev VM with auto-restart.
# Usage: ./scripts/keep-alive.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/.local-run"

PM2="$ROOT/.tools/node_modules/.bin/pm2"
if [[ ! -x "$PM2" ]]; then
  echo "Installing local pm2..."
  mkdir -p "$ROOT/.tools"
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

# Stop fragile one-shots that fight for the ports
pkill -f '/workspace/fleet-api/.*src/index.js' 2>/dev/null || true
pkill -f 'vite --host 0.0.0.0 --port 5174' 2>/dev/null || true
sleep 1

export PUBLIC_WEB_ORIGIN="${PUBLIC_WEB_ORIGIN:-http://127.0.0.1:5174}"
export PAYMENT_PUBLIC_BASE_URL="${PAYMENT_PUBLIC_BASE_URL:-http://127.0.0.1:5174}"

"$PM2" delete btt-fleet-api 2>/dev/null || true
"$PM2" delete btt-fleet-web 2>/dev/null || true

"$PM2" start "$ROOT/fleet-api/src/index.js" \
  --name btt-fleet-api \
  --cwd "$ROOT/fleet-api" \
  --time \
  --max-restarts 50 \
  --restart-delay 2000 \
  --exp-backoff-restart-delay 1000

"$PM2" start npm \
  --name btt-fleet-web \
  --cwd "$ROOT/fleet-web" \
  --time \
  --max-restarts 50 \
  --restart-delay 2000 \
  -- run dev -- --host 0.0.0.0 --port 5174

"$PM2" save 2>/dev/null || true

sleep 2
echo
echo "============================================"
"$PM2" list
echo
curl -s -o /dev/null -w "API health: %{http_code}\n" http://127.0.0.1:4000/api/health || echo "API health: down"
curl -s -o /dev/null -w "Web health: %{http_code}\n" http://127.0.0.1:5174/ || echo "Web health: down"
echo
echo " Web:  http://127.0.0.1:5174/   (use Cursor Ports → 5174)"
echo " API:  http://127.0.0.1:4000/"
echo " Logs: $PM2 logs"
echo " Stop: $PM2 stop all"
echo "============================================"
