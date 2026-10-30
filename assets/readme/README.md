# README visual assets

These editable SVG illustrations support the user-facing [README](../../README.md). They show simplified interfaces with red outlines and numbered markers, using example values. They are documentation diagrams, not browser captures or Chrome Web Store artwork.

The folder also contains a local compatibility badge. The README header reuses the existing [brand icon](../brand/markdown-plus-icon.svg); no separate logo copy is needed.

| File | Purpose |
| --- | --- |
| [01-file-url-access.svg](01-file-url-access.svg) | Find extension Details and enable file URL access in Chrome. |
| [02-popup-reader.svg](02-popup-reader.svg) | Select Reader, choose a theme, adjust typography, and open All settings. |
| [03-theme-library.svg](03-theme-library.svg) | Select an active reader theme or start a custom theme. |
| [04-theme-editor.svg](04-theme-editor.svg) | Follow the five theme-authoring steps and save the draft. |
| [05-general-settings.svg](05-general-settings.svg) | Choose interface language and document updates, and check file access. |
| [06-backup-restore.svg](06-backup-restore.svg) | Export or import settings JSON and locate the reset action. |
| [chrome-116-plus.svg](chrome-116-plus.svg) | Show the minimum Chrome version declared in `manifest.json`; update it if that requirement changes. |

Keep visible control names and order aligned with `src/popup/panels/ReaderPanel.jsx`, `src/options/sections/`, and `src/i18n/locales/en.json`. Retain the illustration label so the diagrams are not mistaken for exact screenshots. Each SVG is self-contained, has a title and description, and uses no scripts, external images, or fonts. Edit the SVG directly and review a rendered copy when updating it; keep any temporary rendering tools and previews outside this final asset folder.
