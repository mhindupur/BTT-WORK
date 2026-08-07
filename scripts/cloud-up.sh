#!/usr/bin/env bash
# Durable start via tmux + restart loop (survives agent tool exits).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMUX_CFG=""
if [[ -f /exec-daemon/tmux.portal.conf ]]; then
  TMUX_CFG="-f /exec-daemon/tmux.portal.conf"
fi

ensure_session() {
  local name="$1"
  local cmd="$2"
  if tmux $TMUX_CFG has-session -t "=$name" 2>/dev/null; then
    echo "tmux session $name already exists"
    return 0
  fi
  tmux $TMUX_CFG new-session -d -s "$name" -c "$ROOT" -- bash -lc "$cmd"
  echo "started tmux session $name"
}

# MySQL
sudo service mysql start 2>/dev/null || true

# Kill port holders that are not our tmux-managed processes (best effort)
fuser -k 4000/tcp 2>/dev/null || true
# leave 5174 if already our vite; restart cleanly below
fuser -k 5174/tcp 2>/dev/null || true
sleep 1

ensure_session "btt-api" 'cd /workspace/fleet-api; while true; do echo "[$(date -Is)] starting API"; node src/index.js >> /workspace/.local-run/api.log 2>&1; echo "[$(date -Is)] API exited $? — restart in 2s"; sleep 2; done'
ensure_session "btt-web" 'cd /workspace/fleet-web; while true; do echo "[$(date -Is)] starting Web"; npx vite --host 0.0.0.0 --port 5174 >> /workspace/.local-run/web.log 2>&1; echo "[$(date -Is)] Web exited $? — restart in 2s"; sleep 2; done'

mkdir -p /workspace/.local-run
sleep 3
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:4000/api/health || echo "API: down"
curl -s -o /dev/null -w "WEB: %{http_code}\n" http://127.0.0.1:5174/ || echo "WEB: down"
tmux $TMUX_CFG ls 2>/dev/null || true
