#!/bin/bash
# Scheduler entry point. Runs one --confirm attempt and appends output to logs/YYYY-MM-DD.txt.
set -u
cd "$(dirname "$0")" || exit 1
mkdir -p logs
PY="python3"
[ -x ".venv/bin/python" ] && PY=".venv/bin/python"
export TZ=Asia/Singapore
LOG="logs/$(date +%F).txt"
{
  echo "===== run started $(date '+%Y-%m-%d %H:%M:%S %Z') ====="
  "$PY" book_studio.py --confirm "$@"
  echo "===== exit code $? ====="
} >> "$LOG" 2>&1
