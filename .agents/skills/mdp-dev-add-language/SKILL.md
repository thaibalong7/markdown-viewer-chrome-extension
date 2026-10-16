---
name: mdp-dev-add-language
description: >-
  Add an interface language to Markdown Plus with complete catalogs, locale
  integration, and a thorough review of natural wording against tools in the
  target language. Use when adding a locale, supporting another UI language,
  or completing a newly added translation; not for translating document content.
---

# Add a Markdown Plus interface language

Deliver a working locale whose interface reads as if it were written for its users. Translation completeness and native-language quality are separate requirements; a catalog passing automated checks does not establish that its wording is natural.

## Establish the locale and context

Read [Interface languages](../../../docs/internationalization.md), the interface-language section of the [architecture overview](../../../docs/architecture-overview.md), and the scoped [internationalization rule](../../rules/35-internationalization.md). Inspect the current runtime and tests before editing; the ownership map in the documentation identifies the integration points. Read the shared principles and the target locale's existing section in the [Localization writing guide](../../../docs/localization.md).

Use the user's requested language and regional variant. The current resolver supports base languages, not distinct regional/script catalogs, and the existing UI is left-to-right. If the request needs regional distinctions or right-to-left layout, address the necessary resolution, direction, and layout behavior within the requested locale instead of silently collapsing it into an unsuitable base locale. Ask only when an unresolved choice materially affects the result.

Inventory every English catalog leaf and its actual consumers. Group the review by Settings, Popup, Viewer shell/panels, explorer, editor/search, change review, content toolbars, colors/lightboxes, diagnostics, and native extension metadata. Include descriptions, tooltips, accessible labels, confirmations, loading/empty/error states, and infrequent actions. Inspect the owning component or service when a short label is ambiguous; the key or English wording alone may not reveal its meaning.

## Research terminology before translating

Browse official localized interfaces or help from established tools used in the target language, choosing comparable features: a document editor for search/replace, a browser for settings/history/permissions, and a development tool for source comparison or technical controls. Use multiple relevant references where available. Read the actual target-language page, record its URL and the term or convention it informs, and distinguish material you could inspect from unavailable sources. Do not present search snippets, an English page, or an unread style guide as evidence of target-language usage.

Extend the target locale's section in the shared [writing guide](../../../docs/localization.md), or add a section using its canonical locale code, with the chosen vocabulary, tone, context-sensitive exceptions, and concise source comparisons. Keep shared principles in the common section; adding a locale does not require a separate Markdown guide. Existing product translations are evidence, not unquestionable wording: compare the behavior and choose what makes sense in Markdown Plus. Preserve the user's established vocabulary where it fits. Do not copy lengthy source passages or add network translation services to the extension.

## Integrate the locale

Follow the [adding-a-language integration map](../../../docs/internationalization.md#adding-a-language) and verify each point against current code:

- Add the selectable locale and language label, complete the same nested semantic IDs in every catalog, and register the new catalog. Use stable labels such as `options.general.title`; never use English sentences as translation keys or rename keys just to improve wording.
- Translate the full target catalog, including service presentation and CodeMirror phrases. Preserve `{name}`, `{0}`, and CodeMirror `$` substitutions; reorder them when grammar requires. Use complete messages, locale-appropriate plural variants with `other`, and numeric/date formatting rather than assembling translated fragments.
- Add Chrome metadata under `public/_locales/` using its supported locale identifier. Chrome metadata selection and native file/permission/print dialogs follow Chrome's language separately from the application's preference.
- Verify preference validation, automatic browser-language selection, English fallback, import/export/reset, and live switching. Existing registry-derived paths may need no implementation edit; prove they accept the locale. Update tests that use the new locale as an unsupported example without weakening unsupported-value coverage.

Keep document bodies, drafts, diffs, filenames, paths, URLs, custom names, code, and copied/exported source literal. Retain message descriptors for visible state so language changes update it. Preserve the UI/document ownership boundary, including `placeholderMessage` for the workspace file-selection prompt. Follow the scoped rule for legacy diagnostic adaptation and stable service contracts.

## Review every translation in two passes

1. **Meaning and behavior:** compare each message with its consumer and English intent. Preserve conditions, scope, permissions, units, limits, and consequences. Clearly distinguish clearing history from deleting files, canceling from discarding, and reloading a saved file from overwriting an unsaved draft. A natural rewrite may change word order, sentence structure, and vocabulary, but must not change behavior or weaken a warning.
2. **Native-language reading:** read the target text independently, then read neighboring labels, hints, buttons, and states together. Ask whether a user of the reference tools would understand the action immediately. Rewrite English-shaped syntax, dictionary translations, unnecessary technical terms, and stiff or vague wording. Prefer familiar local verbs and expressions over literal equivalence. Use a consistent term for the same concept; allow different terms where the meaning differs. For example, Vietnamese “Engine” can mean “Thư viện Git” in Git diagnostics and “Công cụ vẽ sơ đồ” for Mermaid.

Review the entire catalog, not a sample or only the changed labels. Keep a working coverage checklist by component/namespace so a large catalog can be reviewed in batches without omissions. Machine-generated translations are drafts until both passes are complete. Test complete messages with real-looking interpolation values, including Unicode and long filenames, zero/one/many counts, and a filename that resembles a translation key. Automated key/placeholder parity cannot replace this review; do not claim a native-speaker review unless a person actually performed it.

## Verify the finished language

Run the existing focused i18n tests while iterating, then `npm test`, `npm run build`, and `npm run size:report` for the completed runtime addition. Compare bundle size with the baseline. Add focused regression tests only for new or changed behavior: locale resolution, settings acceptance/rejection, plural selection, live UI updates, or preservation of literal source. Ensure English fallback is a resilience mechanism rather than a way to ship missing translations.

Check the unpacked extension with the new locale selected and in automatic mode. Walk every inventoried surface, including an open toast/dialog, search panel, independent content portals, the workspace selection prompt, and error/empty states. Switch away and back while editing; preserve draft, undo, focus, document identity, and literal source. Check font coverage, accents, wrapping/truncation, accessible names, light/dark themes, and narrow Popup/dialog/lightbox layouts. Consult the [design-system lookup](../../../docs/design-system/README.md#find-the-relevant-contract) for any necessary layout adjustment; shorten labels only when their meaning remains clear.

Update supported-language documentation and the locale's section in the shared writing guide. Keep revision-specific coverage, test/build results, bundle comparisons, and unverified checks in the task or pull request rather than permanent locale documentation. Report the implemented locale, reviewed coverage, terminology decisions with sources actually consulted, automated results, and any visual or Chrome checks that remain unverified. If research or browser access is unavailable, complete independent work and state the remaining limitation rather than claiming that research or visual review passed.
