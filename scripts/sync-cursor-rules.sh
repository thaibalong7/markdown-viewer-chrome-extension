#!/usr/bin/env bash
# Generate Cursor rule adapters from the shared source under .agents/rules.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p .cursor/rules

for source in .agents/rules/*.md; do
  name=$(basename "$source" .md)
  cp "$source" ".cursor/rules/$name.mdc"
done

echo "OK — generated Cursor rule adapters from .agents/rules"
