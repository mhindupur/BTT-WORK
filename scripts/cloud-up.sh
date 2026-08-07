#!/usr/bin/env bash
# Durable start via tmux + restart loop (survives agent tool exits).
# Does NOT kill healthy services — only starts missing sessions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/.local-run"

TMUX=(tmux)
if [[ -f /exec-daemon/tmux.portal.conf ]]; then
  TMUX=(tmux -f /exec-daemon/tmux.portal.conf)
fi

ensure_session() {
  local name="$1"
  local cmd="$2"
  if "${TMUX[@]}" has-session -t "=$name" 2>/dev/null; then
    echo "tmux session $name already exists"
    return 0
  fi
  "${TMUX[@]}" new-session -d -s "$name" -c "$ROOT" -- bash -lc "$cmd"
  echo "started tmux session $name"
}

# MySQL
sudo service mysql start 2>/dev/null || true

ensure_session "btt-api" 'cd /workspace/fleet-api; while true; do echo "[$(date -Is)] starting API"; node src/index.js >> /workspace/.local-run/api.log 2>&1; code=$?; echo "[$(date -Is)] API exited $code — restart in 2s"; sleep 2; done'
ensure_session "btt-web" 'cd /workspace/fleet-web; while true; do echo "[$(date -Is)] starting Web"; npx vite --host 0.0.0.0 --port 5174 >> /workspace/.local-run/web.log 2>&1; code=$?; echo "[$(date -Is)] Web exited $code — restart in 2s"; sleep 2; done'
ensure_session "btt-watchdog" 'while true; do
  api=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:4000/api/health || echo 000)
  web=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:5174/ || echo 000)
  mysqladmin ping -h 127.0.0.1 -ubtt -pbtt --silent 2>/dev/null || sudo service mysql start 2>/dev/null || true
  if [[ "$api" != "200" ]]; then
    echo "[$(date -Is)] API unhealthy ($api) — recreating session" | tee -a /workspace/.local-run/watchdog.log
    if [[ -f /exec-daemon/tmux.portal.conf ]]; then tmux -f /exec-daemon/tmux.portal.conf kill-session -t "=btt-api" 2>/dev/null || true
    else tmux kill-session -t "=btt-api" 2>/dev/null || true; fi
    sleep 1
    /workspace/scripts/cloud-up.sh >> /workspace/.local-run/watchdog.log 2>&1 || true
  fi
  if [[ "$web" != "200" ]]; then
    echo "[$(date -Is)] Web unhealthy ($web) — recreating session" | tee -a /workspace/.local-run/watchdog.log
    if [[ -f /exec-daemon/tmux.portal.conf ]]; then tmux -f /exec-daemon/tmux.portal.conf kill-session -t "=btt-web" 2>/dev/null || true
    else tmux kill-session -t "=btt-web" 2>/dev/null || true; fi
    sleep 1
    /workspace/scripts/cloud-up.sh >> /workspace/.local-run/watchdog.log 2>&1 || true
  fi
  sleep 45
done'

sleep 2
echo
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:4000/api/health || echo "API: down"
curl -s -o /dev/null -w "WEB: %{http_code}\n" http://127.0.0.1:5174/ || echo "WEB: down"
"${TMUX[@]}" ls 2>/dev/null || true
echo
echo "Open via Cursor Ports → 5174  (or http://127.0.0.1:5174/ inside this VM)"
echo "Logs: .local-run/api.log  .local-run/web.log"
