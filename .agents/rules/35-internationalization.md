---
description: "Markdown Plus semantic translation IDs, locale integration, natural UI wording, and literal document boundaries."
alwaysApply: false
globs:
  - "src/**/*.{js,jsx,html}"
  - "src/i18n/locales/*.json"
  - "public/_locales/**/*.json"
  - "manifest.json"
  - "docs/internationalization.md"
  - "docs/localization.md"
paths:
  - "src/**/*.js"
  - "src/**/*.jsx"
  - "src/**/*.html"
  - "src/i18n/locales/*.json"
  - "public/_locales/**/*.json"
  - "manifest.json"
  - "docs/internationalization.md"
  - "docs/localization.md"
trigger: glob
---

# Internationalization

Apply these constraints when changing application copy, locale handling, or UI message state in the scoped files. Unrelated implementation work does not require a translation audit. Runtime ownership and examples live in [Interface languages](../../docs/internationalization.md); use [mdp-dev-add-language](../../.agents/skills/mdp-dev-add-language/SKILL.md) for an additional locale or completion of a new translation.

## Messages and language changes

- Use nested semantic IDs such as `options.general.title` and `popup.footer.allSettings` in `t()` calls and UI metadata. Keep IDs stable when wording changes; use separate IDs for different meanings. Add every new message to all runtime catalogs. English source sentences are not application translation keys.
- Subscribe translated React UI with `useLocale()` at an unconditional hook position, including independent content portals. Keep dynamic visible state as `message(key, values)` until presentation; do not freeze translated strings in long-lived state or stringify descriptors. Translate nested labels with explicit descriptors; ordinary interpolation strings remain literal.
- Keep catalogs plain text and render through React or safe DOM text/attributes. Do not introduce translated HTML or bypass document sanitization. Preserve interpolation names, CodeMirror `$` markers, and complete sentences. Counted entries require `other`; choose additional forms for the target language. Pass numbers as numbers and use locale-aware number/date formatting.
- Treat the supported-language registry, catalog registration, synchronized preference validation, browser resolution, native metadata, and CodeMirror phrases as one integration. Preserve English fallback, successful-save-only runtime updates, invalid stored-value recovery, and strict save/import rejection. Chrome-native UI language is independent of the runtime preference.

## UI and literal content

- Translate application controls and owned presentation messages, never document bodies, source/diffs, headings, filenames, paths, URLs, user theme names, code identities, or copied source. A document can legitimately contain a string identical to a catalog ID.
- Keep workspace-selection UI in `loadedDocument.placeholderMessage` with empty `text`, rendered by the subscribed `DocumentState` portal. Never fix a visible raw key by translating arbitrary article text or inserting a translated prompt into the document source.
- Keep existing English service `Error.message` contracts stable. Register owned legacy diagnostics in `src/i18n/diagnostic-keys.js` and adapt through `translateMessage()` at UI presentation. New UI state should use semantic IDs/descriptors directly. Unknown browser/third-party errors remain literal; do not translate protocol values or logs by guessing at English text.

## Editorial quality and checks

- Write natural target-language UI for the action and context, not a word-for-word rendering of English. Preserve behavior, limits, permissions, and consequences while choosing familiar local terms. Keep labels concise and use descriptions to explain scope; never obscure loss of unsaved work or confuse clearing history with deleting a file.
- Review new or changed wording with its neighboring controls, tooltips, accessible labels, and states. Follow the shared principles and target locale's section in the [Localization writing guide](../../docs/localization.md); add a section there for new editorial decisions rather than requiring a separate guide per locale. When adding a language, review every catalog entry and compare terminology with actual localized tools using the skill workflow.
- Run focused catalog/live-switching tests for translation changes; run the full suite and production build for runtime additions, plus a size comparison for another bundled catalog. Inspect affected UI for wrapping, font coverage, accessibility, and narrow layouts. Report unperformed visual/Chrome checks explicitly.
