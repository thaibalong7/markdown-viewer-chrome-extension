# Cursor agent configuration

Shared skills are discovered directly from `.agents/skills/`; do not create a
second catalog under `.cursor/skills/`.

Files under `.cursor/rules/*.mdc` are generated adapters for the canonical
sources in `.agents/rules/*.md`. Edit only the source and regenerate adapters:

```bash
bash scripts/sync-cursor-rules.sh
bash scripts/check-agents.sh
```

The former `.cursor/commands/` workflows were migrated to shared skills. Do not
recreate command copies for those workflows.
