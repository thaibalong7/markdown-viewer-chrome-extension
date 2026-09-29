---
description: "Markdown Plus plugin classification, registration, settings, assets, and safety."
alwaysApply: false
globs:
  - "src/plugins/**/*.js"
  - "src/settings/default-settings.js"
  - "src/popup/**/*.{js,jsx}"
  - "src/shared/settings-diff.js"
  - "src/viewer/core/**/*.js"
  - "src/viewer/mermaid/**/*.js"
  - "manifest.json"
paths:
  - "src/plugins/**/*.js"
  - "src/settings/default-settings.js"
  - "src/popup/**/*.js"
  - "src/popup/**/*.jsx"
  - "src/shared/settings-diff.js"
  - "src/viewer/core/**/*.js"
  - "src/viewer/mermaid/**/*.js"
  - "manifest.json"
trigger: glob
---

# Plugins

- Classify every plugin explicitly as core or optional.
- Use `src/plugins/core/**` for lightweight baseline Markdown behavior that most documents benefit from.
- Use `src/plugins/optional/**` for specialized or heavier behavior such as diagrams, math, extra syntax, large dependencies, or lazy initialization.
- Add plugin ids and default state in `src/plugins/plugin-types.js`; `DEFAULT_SETTINGS.plugins` must continue to consume `getDefaultPluginSettings()` instead of duplicating the shape.
- All currently registered core and optional plugins default to enabled. Changing that product default must be deliberate and covered by default-settings plus render-context tests.
- Register core plugins and optional loader functions in `src/plugins/plugin-manager.js`; optional implementations must remain dynamically imported only when enabled.
- Add popup labels in `src/popup/settings-constants.js`; plugin UI should be driven from merged defaults/settings rather than duplicated shapes.
- Keep core plugin modules lightweight; heavy dependencies such as KaTeX and Mermaid must stay behind optional dynamic-import boundaries.
- Plugin failures must not break the full viewer. Log warnings and keep safe fallback content.
- If runtime assets are loaded through extension URLs, update `manifest.json` `web_accessible_resources` in the same change.
- Any plugin output that becomes article HTML must stay inside the render sanitizer path.
