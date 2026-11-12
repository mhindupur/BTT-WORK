#!/usr/bin/env bash
# Stop local API/web processes started by scripts/local-up.sh (keeps Docker MySQL unless --all).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .local-run/api.pid ]]; then
  kill "$(cat .local-run/api.pid)" 2>/dev/null || true
  rm -f .local-run/api.pid
  echo "Stopped API"
fi
if [[ -f .local-run/web.pid ]]; then
  kill "$(cat .local-run/web.pid)" 2>/dev/null || true
  rm -f .local-run/web.pid
  echo "Stopped Web"
fi

# Also kill stray listeners on common ports (best-effort)
if command -v lsof >/dev/null 2>&1; then
  lsof -ti tcp:4000 | xargs kill 2>/dev/null || true
  lsof -ti tcp:5174 | xargs kill 2>/dev/null || true
fi

if [[ "${1:-}" == "--all" ]]; then
  docker compose -f docker-compose.fleet.yml down
  echo "Stopped Docker MySQL (btt-fleet-mysql)"
fi

echo "Done."
