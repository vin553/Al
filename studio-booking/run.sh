#!/bin/bash
# Scheduler entry point (launchd/cron): one real booking attempt for next Saturday evening,
# appended to logs/YYYY-MM-DD.txt. Add "morning" or a date after run.sh to change it.
cd "$(dirname "$0")" || exit 1
mkdir -p logs
export TZ=Asia/Singapore
LOG="logs/$(date +%F).txt"
{
  echo "===== run started $(date '+%Y-%m-%d %H:%M:%S %Z') ====="
  ./studio book --headless "$@"
  echo "===== exit code $? ====="
} >> "$LOG" 2>&1
