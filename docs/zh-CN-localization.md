# 简体中文（中国）界面用语

Markdown Plus uses `zh-CN` for Simplified Chinese (China), with the self-identifying menu label **简体中文（中国）** in every catalog. Chrome extension metadata uses `zh_CN`. This guide covers application-owned interface text; real document bodies, headings, drafts, diffs, filenames, paths, URLs, code, custom theme names and copied/exported content remain literal.

## Locale selection

Explicit settings save/import accepts the canonical `zh-CN` preference. Automatic selection accepts bare `zh`, the `CN` and `SG` regions, and explicit `Hans` script variants. Bare `zh` intentionally defaults to Simplified Chinese. An explicit script overrides region: `zh-Hans-TW` selects this catalog, while `zh-Hant-CN` does not. Traditional Chinese (`Hant`, `TW`, `HK`, `MO`) and other regions without a supported script are skipped so the next preferred supported language can be selected; otherwise English is used. This does not claim Traditional Chinese support. The existing left-to-right layout remains appropriate.

## Vocabulary and tone

Use concise verbs for actions, direct explanations for settings, `请` for actionable error guidance, and `您` only where addressing the user helps. Use Simplified characters, Chinese punctuation (`，。：“”`), and familiar Mainland software terms. Keep technology names, API identifiers, keyboard shortcuts, units and extensions recognizable. Prefer `正在…` for ongoing work and `已…` for completed work. Do not translate `true`/`false` in settings-validation diagnostics because these refer to JSON values.

| Concept | Chosen wording and context |
| --- | --- |
| Settings / General / Interface language | 设置 / 常规 / 界面语言 |
| Popup / Viewer | 弹出窗口 / 查看器 in explanatory text |
| Reader / Editor | 阅读 for the compact tab, 编辑器 for the editor and its preferences |
| Files / Outline / Table of contents | 文件 / 大纲 / 目录; Outline is a panel, while a document TOC is 目录 |
| Workspace / Folder | 工作区 / 文件夹; use 根目录 for the workspace root |
| Find / Replace / Replace all | 查找 / 替换 / 全部替换; replacement input is 替换为 |
| Match case / Whole word / Regular expression | 区分大小写 / 全字匹配 / 正则表达式 |
| Discard changes / Keep editing / Cancel | 放弃更改 / 继续编辑 / 取消; canceling a dialog does not imply discarding a draft |
| Load disk version | 加载磁盘版本; close the editor and load an already-saved external version, without overwriting disk |
| Draft loss | 丢弃…，草稿无法恢复 makes permanent loss explicit |
| Recent files / Clear history | 最近文件 / 清除最近文件记录; the confirmation explicitly says original files are not deleted |
| Source comparison / Changed area | 比较 / 更改区域; 新行号 and 旧行号 identify version-specific line-number columns |
| Git repository / Branch / Engine | 仓库 / 分支 / Git 库; retain HEAD, .git and raw Git status identifiers |
| Code highlighting / Render resolution | 代码高亮 / 渲染分辨率; caption 分辨率, limit 最高, failure 失败, unavailable 不可用 |
| Theme active / Color token / Muted text | 使用中 / 颜色标记 / 次要文字; these describe theme usage and semantic colors rather than syntax tokens |
| Inline/fallback code | 行内及未高亮代码; avoids suggesting that a spare copy of code is stored |
| GitHub Alerts | GitHub 提示块; preserve distinctions among 注意、提示、重要、警告、注意危险 |

Chinese counted entries use only `other`; examples are `0 个词`, `1 个词`, `1,234 个词`, and `最近文件：12 个`. Interpolate numbers as numbers through the runtime. Dates use `zh-CN` formatting, not manually translated timestamps. Word counts retain the existing document-statistics algorithm; the locale addition does not redefine Chinese word segmentation.

Existing fragment-based consumers were checked as complete rendered groups: `行 12，列 3`, `区域 1 / 3`, `1 行新增 · 0 行删除`, `123 字节已加载`, theme-limit text around `32`, inherited syntax-theme labels and the linked Chrome permission instructions. Preserve the ASCII opening parenthesis in the inherited-theme prefix because its component supplies the closing `)`. The theme preview's Token column contains semantic color roles, so it uses 颜色标记. Sample filenames and the `docs` folder remain unchanged.

## Sources consulted

The actual Simplified Chinese page content below was opened and read on 2026-10-16. These sources informed terminology; their wording was compared with Markdown Plus behavior rather than copied wholesale. No network translation service or runtime dependency was added.

| Official reference | Evidence and decision |
| --- | --- |
| [Word：查找和替换文本](https://support.microsoft.com/zh-cn/word/training/find-and-replace-text-in-word) | The Chinese article uses 查找、替换为、全部替换、区分大小写 and 全字匹配. These fit CodeMirror's search controls. Use 下一处/上一处 consistently for matches instead of mixing page/occurrence terminology. |
| [Chrome：安装和管理扩展程序](https://support.google.com/chrome/answer/2664769?hl=zh-Hans) | Read the management and site-access sections: 设置、扩展程序、详情、权限 and 开启 are familiar browser terms. Native Chrome permission/file/print dialogs follow Chrome's language independently of this preference. |
| [Chrome：删除浏览数据](https://support.google.com/chrome/answer/2392709?hl=zh-Hans) | The article distinguishes removing history entries from other data. Markdown Plus uses 清除最近文件记录 to name the specific list being cleared; this action does not delete local files. |
| [Visual Studio：比较文件](https://learn.microsoft.com/zh-cn/visualstudio/ide/compare-with?view=vs-2022) | The article body, despite an authorization banner, was readable: comparison/difference views, old/new versions, read-only content, added/deleted lines and navigation among changed portions. Use 比较、差异、只读、新增、删除. Avoid awkward machine-translated menu labels in that article. |
| [Chrome i18n supported locales](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) | This English API reference verifies packaging identifiers `zh_CN` and `zh_TW`; it is technical evidence, not evidence of Chinese UI wording. |

## Two-pass review coverage

Every one of the **1,013 semantic messages** was reviewed in two separate passes: first against English intent and its owning component/service or explicit legacy-diagnostic adapter, then as Chinese text with neighboring labels, hints, actions and states. Plural variants are counted as one message. The Chrome metadata description was reviewed separately. This is an AI editorial review, not a claim of human native-speaker review.

| Review group | Namespaces / consumer ownership | Meaning and behavior | Chinese wording and consistency |
| --- | --- | --- | --- |
| Shared controls and statuses | `common.*`; shared controls, theme labels and language registry | Complete | Complete |
| Settings | `options.*`; General, theme library/editor/background/colors/syntax/preview, Explorer, Privacy, Advanced, About and notifications | Complete | Complete |
| Popup | `popup.*`; ReaderPanel, EditorSettingsPanel, PluginsPanel, FileHistoryPanel, FileAccessCallout and shared metadata | Complete | Complete |
| Viewer shell and panels | `viewer.actions`, `app`, `layout`, `outline`, `statistics`, `updates`, `render`, document loaders/renderers/states and scrollbar | Complete | Complete |
| Files and workspace | `viewer.explorer`, row/link actions and `useexplorer`; explorer context/actions, scans, refresh, navigation and placeholder | Complete | Complete |
| Editor and search | `viewer.editor.*`; connection, save/conflict, dirty/clean update confirmations, status bar and CodeMirror phrase adapter | Complete | Complete |
| Change review | `viewer.review`, `lineDiff`; comparison states, limits, affected sections, navigation and source-table accessibility | Complete | Complete |
| Content toolbars and alerts | `viewer.code`, `mermaid`, `plugins.*`; code/Mermaid controls, section links and alerts | Complete | Complete |
| Colors and lightboxes | `viewer.colors`, `media`, `articleInteractions`; copy feedback, inspector, zoom, resolution and bitmap limits | Complete | Complete |
| Diagnostics and technical controls | `errors.*`, `services.*`, renderer registry, Git/probe/image revision messages; diagnostic adapter and settings validation labels | Complete | Complete |
| Native metadata | `public/_locales/zh_CN/messages.json` | Complete | Complete |

The review corrected theme-state wording (使用中), semantic color-token wording (颜色标记), fallback code wording, post-number byte labels, recent-file count order and explicit unrecoverable draft-loss warnings. Real Chrome inspection also exposed an existing image-accessibility bug: a message descriptor was being stringified into `aria-label`. The image decoration now resolves the descriptor at presentation; its alt text remains literal, including text resembling a catalog ID. Change-review row markers also resolve translated 新增、删除、未更改 accessibility labels instead of exposing internal `added`/`removed`/`equal` values. The added unchanged message received both meaning and wording review in all three catalogs.

## Verification

Focused i18n tests cover complete catalog/placeholder parity, CodeMirror `$` markers, script/region selection, settings acceptance/rejection, persistence/reset and import, Chinese zero/one/many counts and number/date formatting, Unicode/long/key-like filenames, literal source/diffs, live controls and independent content portals, workspace placeholder ownership and visible toasts. A real CodeMirror DOM test switches `en → zh-CN → vi → zh-CN → en` with an open search panel, preserving the query, replacement, case option, focus/selection, document, editor identity and undo history.

Chrome smoke checks and remaining limits are recorded below; automated success alone does not establish visual coverage.

| Chrome smoke check | Result |
| --- | --- |
| Select 简体中文（中国） and reopen Settings | Passed; every Settings section, theme library and unsaved theme editor inspected with screenshots and accessibility text |
| Popup at its native narrow size | Passed for Reader, Editor, Plugins and Recent tabs; labels, descriptions, dates, counts and literal filenames inspected |
| Viewer / Files / Outline / literal source | Passed using a local test document with Chinese text, a key-like string, JavaScript, a Mermaid diagram, an SVG image and a color table |
| Light/dark Viewer and theme toast | Passed; restored the original light theme afterward |
| Code/Mermaid controls and resolution | Passed; collapsed and expanded resolution captions/steps/tooltip fit the existing widths at desktop size; no locale-specific CSS change needed |
| Editor connection / search / save / switching | Passed on a disposable local file. An open search panel and unsaved draft survived `zh-CN → auto (English in this browser) → zh-CN`; query and focus were retained, Undo worked, and saving succeeded |
| Change review | Passed with an externally updated local fixture; section names, source lines, counts, old/new line labels and key-like document text inspected |
| Image accessibility correction | Confirmed on rebuilt/reloaded extension: `缩放图片：测试矢量图片` replaces `[object Object]` |
| Automatic Chinese selection | Script/region combinations verified in tests. Actual browser auto mode selected English according to this profile; browser language preferences were not changed |
| Workspace selection prompt, open toasts, uncommon errors and dirty/clean warnings | Real-DOM tests cover switching/literal ownership and representative states; not every branch was induced manually in Chrome |
| 320px dialogs/lightboxes, touch/reduced-motion variants, every Git diagnostic, native metadata under Chinese Chrome, export/print | Not manually verified in this task. Metadata is packaged under `zh_CN`; native dialogs observed in this browser remained English |

The smoke test restored the original Vietnamese preference and light theme. It used temporary local fixtures rather than user documents. Settings export was inspected: it serializes the complete settings object, including the canonical language, and import validates it through the normal schema.

Final automated results: focused i18n tests **30/30**, full suite **1,333/1,333 across 182 files** with `npm test -- --maxWorkers=2`, production `npm run build` passed, and `npm run size:report` reported 12M dist / 11M JavaScript (rounded disk usage). The default-concurrency rerun hit the existing 80ms diff-review budget in two tests; reducing workers passed without changing the product budget. Existing Vite plugin-option and chunk-size warnings remain. Compared with a fresh build of the pre-translation worktree, exact file bytes increased from 11,496,128 to 11,553,959 for dist (+57,831, 0.50%) and from 11,138,699 to 11,196,400 for JavaScript (+57,701, 0.52%). The baseline includes the unrelated Git-probe work already present in the checkout.
