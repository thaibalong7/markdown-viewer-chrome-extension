# Interface languages

Markdown Plus ships English, Vietnamese, and Simplified Chinese (China) across Settings, Popup, Viewer chrome, document controls, editor dialogs, and CodeMirror search/replace. Choose **Settings → General → Interface language**. The synchronized `language` preference accepts `auto` (default), `en`, `vi`, or `zh-CN`. Automatic mode walks the browser's preferred languages in order and falls back to English. English and Vietnamese regional variants resolve to their base language. Chinese uses script-aware matching: `zh`, `zh-CN`, `zh-SG`, and explicit `zh-Hans` variants resolve to `zh-CN`; `zh-Hant`, `zh-TW`, `zh-HK`, and `zh-MO` are skipped rather than mapped to Simplified Chinese. An explicit script takes precedence over region; other Chinese regions without a supported script are skipped.

The coding contract is [Internationalization](../.agents/rules/35-internationalization.md). For an end-to-end locale addition, use the shared [mdp-dev-add-language skill](../.agents/skills/mdp-dev-add-language/SKILL.md). Language-specific vocabulary and research belong in `docs/<locale>-localization.md`; see the [Vietnamese editorial guide](./vietnamese-localization.md) and [Simplified Chinese editorial guide](./zh-CN-localization.md).

## Ownership and flow

| Source | Responsibility |
| --- | --- |
| `src/i18n/languages.js` | Supported language options and browser-language resolution; dependency-free so schema validation stays lightweight |
| `src/i18n/locales/en.json`, `vi.json`, `zh-CN.json` | Complete message catalogs, including counted forms and service diagnostics |
| `src/i18n/index.js` | Current preference/locale, subscriptions, plain-text interpolation, plural selection, number/date formatting, and diagnostic translation |
| `src/i18n/diagnostic-keys.js` | Explicit catalog IDs for legacy service diagnostic adaptation and validation field labels |
| `src/i18n/react.js` | React subscriptions, extension-page settings notifications, and browser `languagechange` handling |
| `src/i18n/editor-phrases.js` | Maps CodeMirror’s native English phrase IDs to semantic catalog IDs; preserves `$` substitution markers |
| `src/settings/` | Default, strict save/import validation, migration-safe loading, persistence, reset, and UI request client |
| `src/background/settings-broadcast-service.js` | Dispatches settings notifications to content-script tabs and open extension pages |
| `public/_locales/` and `manifest.json` | Native Chrome extension metadata localization, selected by Chrome's own language |

Settings clients initialize the language after successful load/save/reset. Viewer initialization and `updateSettings()` apply it before updating the shell or rendering document decorations. Open Settings and Popup pages subscribe to the existing `SETTINGS_UPDATED` message and update their settings snapshot. Translated React components use `useLocale()` from an unconditional hook position, so independently mounted content portals also respond to changes without remounting the editor or replacing user text. Settings and Popup publish the resolved HTML `lang`; the Viewer publishes it on the themed shell. Changing the language can rerender document decorations through the existing render lifecycle; the editor instance, undo history, and draft remain owned by the editor session.

The additive setting keeps schema version 2. Older settings merge with `language: 'auto'`; unknown stored values recover to `auto`. Explicit unsupported values are rejected on save/import. Import/export/reset include the language through the normal settings service. A failed save does not change the selected runtime language.

## Writing translated UI

Messages use semantic dot-separated IDs backed by nested JSON objects. IDs describe the surface, feature, and purpose; they stay unchanged when wording changes in any language. Group shared actions/statuses under `common`, settings pages under `options`, popup tabs and controls under `popup`, document UI under `viewer`, rendered plugin labels under `plugins`, and service diagnostics under `errors` or the existing `services` namespaces. Put complete sentences in catalogs and interpolate dynamic values with `{name}` (numeric placeholders also exist in migrated messages). Render the result through React or safe DOM text/attribute APIs. Catalogs contain plain text, never HTML; the Markdown/SVG sanitization boundaries remain mandatory.

```jsx
import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'

function FileActions({ fileName }) {
  useLocale()
  return <button aria-label={t('viewer.explorer.actions.menuLabel', { 0: fileName })}>{t('viewer.explorer.header.openFile')}</button>
}
```

For example, `vi.json` stores the General heading as `{"options":{"general":{"title":"Chung"}}}`, and the component calls `t('options.general.title')`. Popup footer actions use `popup.footer.allSettings` and `popup.footer.about`. Keep distinct IDs for unrelated contexts even if their current English wording matches; share IDs only when the meaning is intentionally shared. `t()` resolves an existing leaf, falls back to English when a translation is absent, and returns unknown keys verbatim. It does not look up English source text or return namespace objects.

Store dynamic UI messages using `message(key, values)` rather than concatenating keys or translating before saving state. For example, `message('viewer.actions.theme.switched', { 0: message('common.themeModes.dark') })` stays translatable while a toast is visible. `t()` recursively translates explicit message descriptors, while ordinary interpolation strings remain literal; a filename such as `options.general.title.md` must never become a heading. Metadata uses semantic IDs directly, or a separate `labelKey`/`nameKey` alongside existing domain data. Custom theme names, filenames, source text, and paths remain literal.

The workspace file-selection prompt is UI, even though it appears inside the article. The document session stores it as `placeholderMessage` with empty `text`; the Markdown renderer presents it through the subscribed `DocumentState` portal. Never put an interface key into document source or translate arbitrary Markdown text: a real document may legitimately contain the same key verbatim.

Pass numeric interpolation values as numbers to obtain locale-aware formatting. A counted message can contain `zero`, `one`, `two`, `few`, `many`, and `other` variants; `other` is mandatory. `t()` selects the variant using `Intl.PluralRules` and `values.count`. English word counts have `one`/`other`; Vietnamese and Simplified Chinese use `other`. Do not append English `s` or assume every future language has two plural forms. Use `formatDate()` or an explicit resolved locale for dates; formatting does not alter stored timestamps or numeric settings.

Existing service `Error.message` contracts remain stable English at their ownership boundary. `diagnostic-keys.js` explicitly registers their semantic catalog IDs; `translateMessage()` adapts these diagnostics at UI presentation using the English catalog templates. New UI copy and controller presentation state use semantic IDs or message descriptors directly through `t()`. Unknown browser/third-party diagnostics remain verbatim. Use this adapter only for application UI messages. Never run document bodies, diff source, headings, filenames, paths, URLs, custom theme names, clipboard values, or syntax-language identities through translation. Native confirmation dialogs call `t()` before opening. Chrome's own permission/file/print dialogs follow Chrome's language independently of the application's preference.

CodeMirror receives translated phrases through a dedicated `Compartment`; changing language reconfigures that compartment instead of rebuilding the editor. An open search panel is recreated to refresh its native labels, retaining the search state, focused field/selection, document, and undo history. Built-in theme and technology names remain proper names.

## Vietnamese terminology

| English concept | Vietnamese UI |
| --- | --- |
| Settings / General | Cài đặt / Chung |
| Files / Outline | Tệp / Mục lục |
| Workspace | Thư mục làm việc |
| Reader / Editor | Đọc / Soạn thảo |
| Plugins (compact tab) | Tính năng |
| Discard changes / Keep editing | Bỏ thay đổi / Tiếp tục chỉnh sửa |
| Load disk version | Mở bản đã lưu |
| Render resolution | Độ phân giải hiển thị |
| Privacy & Data | Quyền riêng tư và dữ liệu |

The Vietnamese copy review and terminology choices are recorded in [Quy ước bản dịch tiếng Việt](./vietnamese-localization.md), including the external product references used for comparison. Use direct, natural Vietnamese with explicit consequences for destructive actions. Keep Markdown, Mermaid, KaTeX, Shiki, Git, HEX/RGB/HSL, keyboard shortcuts, file extensions, and proper theme names recognizable. Prefer complete translated messages to assembling fragments when adding new copy.

## Adding a language

The [shared skill](../.agents/skills/mdp-dev-add-language/SKILL.md) owns the research, translation, full editorial review, and delivery workflow. This integration map identifies the current runtime touchpoints:

| Touchpoint | Required integration |
| --- | --- |
| `src/i18n/languages.js` | Register the locale and language-label key; add that label to every runtime catalog |
| `src/i18n/locales/<locale>.json`, `index.js` | Complete every semantic leaf from `en.json`, preserve placeholders, provide appropriate plural forms with `other`, and register the catalog |
| `public/_locales/<chrome-locale>/messages.json` | Add native extension metadata using Chrome's supported locale identifier, which can differ from the runtime identifier |
| `src/i18n/editor-phrases.js` and the runtime catalog | Translate enabled CodeMirror phrases and retain `$` substitutions; extend the adapter only for newly enabled phrases |
| Settings schema, client, import/export/reset, and broadcasts | Verify registry-derived acceptance and live propagation; change implementation only where necessary |
| `src/i18n/__tests__/` | Cover the added locale's resolution, preference handling, counts, and live UI; keep every catalog in generic parity checks |
| Documentation and UI fit | Update supported-language facts, record the locale's terminology/sources, and inspect actual controls in the target language |

The resolver preserves the Simplified/Traditional Chinese distinction before base-language matching for English and Vietnamese. The canonical runtime preference and HTML `lang` are `zh-CN`; Chrome metadata uses `public/_locales/zh_CN/`. Bare `zh` intentionally defaults to Simplified Chinese. Traditional Chinese is not yet supported. Existing language publication sets `lang`, not a complete right-to-left layout contract; an RTL locale still requires direction/layout work.

Some tests deliberately use an unsupported language such as `fr` to exercise fallback and strict rejection. If adding that language, replace those fixtures with a still-unsupported identifier and retain their assertions. Do not remove negative coverage to make a new locale pass.

## Translation review and verification

Review each entry for both behavioral accuracy and natural wording in its actual component. Compare familiar terminology in established tools using the target language, and record references actually read in the locale's editorial guide. Preserve the action's meaning and consequences while allowing different vocabulary, sentence structure, and word order. Read neighboring labels and hints together; a literal sentence can pass placeholder checks while still being confusing. The [skill's editorial passes](../.agents/skills/mdp-dev-add-language/SKILL.md#review-every-translation-in-two-passes) define complete review coverage.

| Surface | Review and smoke checks |
| --- | --- |
| Settings and Popup | Every section/tab, help text, accessible labels, validation, history clearing, import/export/reset, and narrow layouts |
| Viewer and explorer | Actions, Files/Outline, progress, permissions, empty/loading/error states, workspace file-selection prompt, and filenames preserved literally |
| Editor and change review | Original-file selection, save/conflict and dirty confirmations, search/replace, zero/one/many counts, and unchanged draft/undo/focus during switching |
| Document controls and overlays | Code/Mermaid toolbars, color feedback, tooltips, open toasts, zoom and resolution controls, font coverage, and light/dark themes |
| Native Chrome metadata | Packaged description in Chrome's locale; native permission/file/print dialogs remain under Chrome's language |

Inspect wrapping and truncation with real target-language labels. Resolution controls currently have language-specific width rules in `src/viewer/styles/content/_lightbox-resolution.scss`; an added locale needs an actual fit check rather than an assumption that the existing English or Vietnamese widths suffice.

Run focused checks while editing:

```bash
npm test -- src/i18n/__tests__
```

For a completed runtime addition, run `npm test`, `npm run build`, and `npm run size:report`, comparing the bundle with the prior result. Catalog tests enforce nested leaf/key parity, semantic key syntax, nonempty translations, interpolation parity, plural fallback, and registration of literal `t()`/`message()` calls. Real-DOM tests cover live switching, portal updates, visible message descriptors, and preservation of draft/source text, including the workspace placeholder. These checks do not establish natural wording or visual fit. Complete the surface checks above and Chrome smoke checks for file access, editing/saving, and export; report any checks that remain unverified.

Catalogs are bundled locally with no translation network request, new dependency, or additional permission. Adding many languages may justify lazy-loading catalogs behind an asynchronous initialization boundary; the current three catalogs use synchronous access so controls and native confirmations have translations available immediately.
