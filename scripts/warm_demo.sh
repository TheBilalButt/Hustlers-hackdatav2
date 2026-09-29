#!/usr/bin/env bash
# Pre-warm demo recipes by calling /api/plan with cached inputs
set -euo pipefail

BASE_URL=${1:-http://localhost:8000}
echo "Warming demo recipes against ${BASE_URL}..."
# TODO: implement demo warming
