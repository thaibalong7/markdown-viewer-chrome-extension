#!/usr/bin/env bash
# Validate the shared agent configuration layout.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
err() { echo "FAIL  $*"; fail=1; }

[ -f agent-config-layout.md ] || err "missing agent-config-layout.md"
grep -Fq 'agent-config-layout.md' AGENTS.md || err "AGENTS.md does not reference agent-config-layout.md"

for directory in .agents/skills/*/; do
  skill=$(basename "$directory")
  [ -f "$directory/SKILL.md" ] || { err "$skill is missing SKILL.md"; continue; }
  name=$(grep -m1 '^name:' "$directory/SKILL.md" | sed 's/name: *//' | tr -d '"'"'"' \r')
  [ "$name" = "$skill" ] || err "$skill frontmatter name '$name' does not match its folder"
  [ "$(find "$directory" -mindepth 2 -name SKILL.md | wc -l)" -eq 0 ] || err "$skill contains a nested SKILL.md"
done

for directory in .agents/skills/*/; do
  skill=$(basename "$directory")
  link=".claude/skills/$skill"
  [ -L "$link" ] || { err "$link is not a symlink"; continue; }
  [ "$(readlink "$link")" = "../../.agents/skills/$skill" ] || err "$link points to $(readlink "$link")"
  [ -f "$link/SKILL.md" ] || err "$link is broken"
done

for link in .claude/skills/*; do
  skill=$(basename "$link")
  [ -d ".agents/skills/$skill" ] || err "$link is stale"
  [ -L "$link" ] || { err "$link must be a symlink"; continue; }
done

for source in .agents/rules/*.md; do
  rule=$(basename "$source")
  link=".claude/rules/$rule"
  adapter=".cursor/rules/${rule%.md}.mdc"

  [ -L "$link" ] || { err "$link is not a symlink"; continue; }
  [ "$(readlink "$link")" = "../../.agents/rules/$rule" ] || err "$link points to $(readlink "$link")"
  [ -r "$link" ] || err "$link is broken"

  [ -f "$adapter" ] || { err "$adapter is missing"; continue; }
  [ ! -L "$adapter" ] || err "$adapter must not be a symlink"
  cmp -s "$source" "$adapter" || err "$adapter differs from $source"
done

for adapter in .cursor/rules/*.mdc; do
  rule=$(basename "$adapter" .mdc)
  [ -f ".agents/rules/$rule.md" ] || err "$adapter is stale"
done

for link in .claude/rules/*.md; do
  rule=$(basename "$link")
  [ -f ".agents/rules/$rule" ] || err "$link is stale"
  [ -L "$link" ] || err "$link must be a symlink"
done

grep -Fq '.agents/rules/*.md' AGENTS.md || err "AGENTS.md is missing the scoped-rule gate"
for source in .agents/rules/*.md; do
  grep -q '^alwaysApply: true$' "$source" || continue
  rule=$(basename "$source")
  grep -Fq ".agents/rules/$rule" AGENTS.md || err "AGENTS.md does not route always-on rule $rule"
done

for rule in skill-lifecycle rule-lifecycle; do
  path=".agents/rules/$rule.md"
  grep -Fq "$path" AGENTS.md || err "AGENTS.md does not route $path"
  grep -Fq "$path" .claude/CLAUDE.md || err ".claude/CLAUDE.md does not route $path"
done

[ ! -d .cursor/skills ] || err ".cursor/skills must not exist"
[ ! -d .codex/commands ] || err ".codex/commands remains after command-to-skill migration"
[ ! -d .cursor/commands ] || err ".cursor/commands remains after command-to-skill migration"

for base in .agents .claude .cursor; do
  [ -d "$base" ] || continue
  while IFS= read -r link; do
    [ -e "$link" ] || err "broken symlink: $link"
  done < <(find "$base" -type l)
done

agents_bytes=$(wc -c < AGENTS.md | tr -d ' ')
[ "$agents_bytes" -lt 32768 ] || err "AGENTS.md exceeds 32 KiB: $agents_bytes bytes"
for source in .agents/rules/*.md; do
  rule_bytes=$(wc -c < "$source" | tr -d ' ')
  [ "$rule_bytes" -lt 12000 ] || err "$source exceeds 12,000 bytes: $rule_bytes"
done

[ "$fail" -eq 0 ] && echo "OK — agent configuration layout is valid"
exit "$fail"
