#!/usr/bin/env bash
# Install the radar systemd user timer. No sudo required.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"

if [ ! -f "$REPO/backend/dist/ingest/index.js" ]; then
  echo "Not built yet. Run this first:  pnpm build"
  exit 1
fi

mkdir -p "$UNIT_DIR"
# Bake the repo path into the unit file, in case the repo has been moved
sed "s#/home/qt/projects/radar#$REPO#g" "$REPO/deploy/radar-ingest.service" > "$UNIT_DIR/radar-ingest.service"
cp "$REPO/deploy/radar-ingest.timer" "$UNIT_DIR/radar-ingest.timer"

systemctl --user daemon-reload
systemctl --user enable --now radar-ingest.timer

echo
echo "Timer enabled. Check it with:"
echo "  systemctl --user list-timers radar-ingest.timer"
echo "  journalctl --user -u radar-ingest -f"
echo "  systemctl --user start radar-ingest      # run once now, to test"
