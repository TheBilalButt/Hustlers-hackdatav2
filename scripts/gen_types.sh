#!/usr/bin/env bash
# Regenerate TypeScript types from IR JSON Schema
set -euo pipefail

echo "Exporting JSON Schema..."
python -m synth.ir.schema_export

echo "Generating TypeScript types..."
# TODO: use json-schema-to-typescript or similar
echo "Types would be generated to src/types/ir.ts"
