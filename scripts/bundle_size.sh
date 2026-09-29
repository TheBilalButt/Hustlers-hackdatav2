#!/usr/bin/env bash
# Check that the runtime bundle stays under 450 MB
set -euo pipefail

MAX_MB=450
SIZE_MB=$(du -sm .venv/ synth/ api/ | awk '{sum+=$1} END {print sum}')
echo "Bundle size: ${SIZE_MB} MB (limit: ${MAX_MB} MB)"

if [ "$SIZE_MB" -gt "$MAX_MB" ]; then
    echo "FAIL: bundle exceeds ${MAX_MB} MB"
    exit 1
fi
echo "PASS"
