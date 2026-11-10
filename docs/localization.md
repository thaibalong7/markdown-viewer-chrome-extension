# Localization writing guide

This is the shared editorial reference for Markdown Plus interface translations: how to write labels and messages, which terms each locale uses, and why those choices fit the product. It is intended for contributors and translation reviewers. The actual translations live in `src/i18n/locales/*.json` and Chrome metadata in `public/_locales/`; website copy lives in `scripts/site/locales/`. This document is not a translated user manual or a copy of those catalogs.

Read [Interface languages](./internationalization.md) for runtime ownership, locale selection, integration, and verification. The [mdp-dev-add-language skill](../.agents/skills/mdp-dev-add-language/SKILL.md) owns the complete language-addition workflow.

## Maintaining this guide

Use one shared guide with a section for each locale that needs recorded editorial decisions. When adding a language, extend this file with its canonical locale code, tone/punctuation conventions, ambiguous or recurring terminology, context-sensitive exceptions, and references actually read. A locale does not require a separate Markdown file. Keep full message catalogs in JSON and avoid documenting every translated label here.

Keep technical behavior and the common test matrix in [Interface languages](./internationalization.md). Report review coverage, test/build results, bundle comparisons, and remaining manual checks in the task or pull request that performed them. Those results describe a particular revision; do not retain dated pass counts or completion tables as current language guarantees. Git history retains previous reports.

| Locale | Editorial decisions |
| --- | --- |
| `en` | [English](#en); website copy follows the independent editorial approach below. |
| `vi` | [Tiếng Việt](#vi) |
| `zh-CN` | [简体中文（中国）](#zh-cn) |
| `es` | [Español](#es) |
| `de` | [Deutsch](#de) |
| `ja` | [日本語](#ja) |
| `ro` | [Română](#ro) |

## Shared writing principles

- Write for the action and result the user needs. Prefer concrete, familiar verbs, concise control labels, and descriptions that explain scope or consequences.
- Translate the meaning in its actual context. Read neighboring labels, hints, accessible names, confirmations, and loading/error states together; avoid importing English word order into another language.
- Preserve conditions, limits, permissions, and warnings. Distinguish clearing recent history from deleting files, canceling a dialog from discarding changes, and loading a saved version from overwriting an unsaved draft.
- Keep names, filenames, paths, URLs, code identities, keyboard shortcuts, extensions, and technical units recognizable. JSON values `true` and `false` remain literal in settings-validation errors. Document bodies, drafts, diffs, and copied/exported source remain literal under the [i18n contract](../.agents/rules/35-internationalization.md).
- Preserve `{name}`, `{0}`, and CodeMirror `$` markers. Read complete messages with real interpolation values, including Unicode, long filenames, key-like text, and zero/one/many counts. Use the runtime's locale-aware number/date formatting and appropriate plural forms.
- Use a consistent term for the same meaning, with context-specific exceptions when needed. Do not impose one locale's vocabulary on another; compare established tools in the target language.
- In document-update messages, explain that the file has stopped changing before it is loaded. Avoid wording that sounds like a stable software release. In user guides, name controls exactly as they appear in the runtime catalog, even when the control label differs from the panel title, such as Show table of contents versus Outline. Explain search caching through its effect on freshness and the difference between searching again and refreshing the file list; implementation names such as Unicode caches and Worker belong in developer documentation.
- Review every new locale in two passes: meaning/behavior first, then natural wording in context. Automated parity checks do not establish language quality or visual fit; use the [verification matrix](./internationalization.md#translation-review-and-verification). Machine-generated copy remains a draft until reviewed; identify AI review accurately and claim native-speaker review only when a person performed it.

## Website writing

Website editions are written for their own readers. The English site supplies message keys and markup placeholders, but its sentences and metaphors are not mandatory templates for the other languages’ marketing copy. Lead with the practical reading experience, then support it with concrete capabilities: outline navigation, syntax highlighting, math/Mermaid, related-file browsing, update comparisons, custom themes, and optional editing/export. Use concise headings and clear installation actions. Avoid sweeping completeness claims or invented outcomes. User installation uses Chrome Web Store; link directly to the published listing and retain one-time file URL access setup. Keep the editor labeled experimental, distinguish Word-compatible export from PDF through Chrome printing, and retain the local-processing policy's network qualifications. Privacy messages may be rewritten for clarity, but their conditions, disclosures, and effective date must stay equivalent.

English uses short, direct benefit statements such as “Your Markdown. A better read.” and follows them with actual features. Prefer specific actions such as installing from Chrome Web Store and enabling file URL access over installation metaphors. Source builds and unpacked loading belong in developer setup and release QA, not public installation instructions. Keep source examples, filenames and technical identifiers literal across all editions.

## en

Use sentence case, concise action labels, and the proper capitalization of Markdown. The replacement field is Replace with; Replace names the action. Clear recent-file paths or history rather than suggesting that original files are deleted. Keep changing search results distinct from text replacement. [Google Docs — Find and replace](https://support.google.com/docs/answer/62754?hl=en) informs field/action naming, [Chrome — Delete browsing data](https://support.google.com/chrome/answer/2392709?hl=en) distinguishes history entries from other stored data, and [Visual Studio — Compare files](https://learn.microsoft.com/en-us/visualstudio/ide/compare-with?view=vs-2022) provides comparison, old/new version, and read-only terminology. These sources were readable; the Visual Studio article displayed an authorization banner above its accessible body.

## vi

### Tone and context

Use active voice, familiar words, and concrete verbs such as “Mở” (Open), “Chọn” (Select), “Lưu” (Save), “Sao chép” (Copy), and “Thu gọn” (Collapse). Avoid literal English constructions such as “phiên bản sẽ được áp dụng”, “bề mặt nội dung”, or “ngữ cảnh Chrome” when more specific wording is available. Read Vietnamese sentences independently, then alongside neighboring controls.

“Xóa danh sách” removes only remembered entries; “Ghi nhớ tệp đã mở” does not mean creating file copies. Distinguish “Hủy” (cancel the current operation) from “Bỏ thay đổi” (discard edits). Do not shorten warnings until this distinction is lost.

Use “Mở bản đã lưu” when loading content already written to disk. Descriptions must explain that the file changed outside Markdown Plus and whether the current draft will be replaced. For editing permissions, explain selecting the correct original file and granting save access; “Kết nối tệp” should not be the main user-facing explanation.

Use tệp, thư mục làm việc, tiêu đề, khối mã, mã nguồn and chú thích cuối trang consistently in interface instructions and the guide. Preserve actual English control names when identifying Chrome controls for readers using English Chrome. A retained file handle is thông tin truy cập tệp, not the permission itself: forgetting the reference does not revoke Chrome's file access. Search and editor matching controls share Phân biệt chữ hoa, chữ thường and Khớp toàn bộ từ.

Terminology depends on meaning: “Engine” in Git information becomes “Thư viện Git”, while the Mermaid renderer is “Công cụ vẽ sơ đồ”. Preserve Markdown, Mermaid, KaTeX, Shiki, Git, HEX/RGB/HSL, and named themes. For new terminology, compare Vietnamese interfaces or help pages in the same context and record sources actually read below.

### Terminology

| Concept | Chosen Vietnamese wording |
| --- | --- |
| Settings / General | Cài đặt / Chung |
| Theme / Base theme | Giao diện / Giao diện gốc |
| Reader / Editor | Đọc / Soạn thảo |
| Plugins (compact tab) | Tính năng |
| Discard changes / Keep editing | Bỏ thay đổi / Tiếp tục chỉnh sửa |
| Render resolution | Độ phân giải hiển thị |
| Privacy & Data | Quyền riêng tư và dữ liệu |
| Workspace | Thư mục làm việc |
| Popup | Bảng tiện ích |
| Files / Outline | Tệp / Mục lục |
| Word count, character count, reading time | Thống kê tài liệu |
| Tree indent guides | Đường nối cây thư mục |
| Indexing files (in scan-limit settings) | Thêm tệp vào danh sách |
| Saved disk version / Load disk version | Bản đã lưu / Mở bản đã lưu |
| Diff area | Đoạn thay đổi |
| Content surface | Nền nội dung |
| Rendered code theme | Bộ màu cú pháp |
| Replace / Replace with / Replace all | Thay thế / Thay thế bằng / Thay thế tất cả |
| Match case / Whole word | Phân biệt chữ hoa, chữ thường / Khớp toàn bộ từ |
| Zoom in / Zoom out | Phóng to / Thu nhỏ |

### Website copy

The Home page uses a friendly, natural voice: “Mở Markdown. Đọc thật thoải mái.” and “Giao diện theo gu của bạn.” Descriptions explain concrete benefits through outlines, file trees, syntax highlighting, change comparisons, and editing with live preview. Prefer “tệp trên máy”, “giao diện sáng/tối”, and “xem phần thay đổi”; avoid metaphors about light, homes, or ideas when they do not explain the product. Installation uses Chrome Web Store and file-access permission; link to the published listing and keep file-access setup explicit. Source-build instructions belong only in developer documentation. The policy uses clear sentences explaining where data is stored and when network connections occur, preserving every qualification in the original.

The previous website wording review used [Chrome — Cài đặt và quản lý tiện ích](https://support.google.com/chrome/answer/2664769?hl=vi) to compare “tiện ích”, “Chi tiết”, and “quyền truy cập”, plus [Chrome — Xóa dữ liệu duyệt web](https://support.google.com/chrome/answer/2392709?hl=vi) to distinguish removing history entries from deleting stored data. Website copy is adapted to Markdown Plus usage rather than copied from help articles.


The review also compared [Microsoft Word’s Vietnamese product page](https://www.microsoft.com/vi-vn/microsoft-365/word) for its progression from reading/writing benefits to concrete functions and direct action verbs in calls to action. This informs message organization only; do not copy marketing sentences or attribute Word features to Markdown Plus.

### References

The references below inform terminology and common labels. Final wording follows actual Markdown Plus behavior; do not copy entire help passages or assume every translated help article is authoritative. These references record earlier research, rather than a new source review each time this guide is edited.


| Reference | Editorial focus |
| --- | --- |
| [Google Tài liệu — Tìm và sử dụng tính năng tìm và thay thế](https://support.google.com/docs/answer/62754?co=GENIE.Platform%3DDesktop&hl=vi) | Search labels, replacement fields, and Replace all actions |
| [Microsoft PowerPoint — Tìm và thay thế văn bản](https://support.microsoft.com/vi-vn/powerpoint/find-and-replace-text) | Distinguishing Find, Replace, and Replace all |
| [Mozilla — Tùy chọn và cài đặt của Firefox](https://support.mozilla.org/vi/kb/tuy-chon-va-cai-dat-cua-firefox) | Settings, themes, fonts, tabs, and interface language |
| [Google Chrome — Đặt lại các chế độ cài đặt về mặc định](https://support.google.com/chrome/answer/3296214?hl=vi) | Explaining the scope of a settings reset |
| [Google Chrome — Xóa dữ liệu duyệt web](https://support.google.com/chrome/answer/2392709?hl=vi) | Distinguishing removed data, retained data, and history entries |

## zh-CN

The interface label is **简体中文（中国）**. Runtime/Chrome locale identifiers and script matching are documented in [Interface languages](./internationalization.md#adding-a-language).

### Tone and terminology

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

Use 文件停止变化 for a file that has stopped changing, rather than calling it a 稳定版本. Quote interpolated validation labels with Chinese quotation marks. Guide instructions use the actual labels 验证文件并编辑、重置所有设置 and 选择 JSON 文件; identify the 文件 panel explicitly when prose could otherwise suggest selecting a file inside another file.

Read existing fragment-based consumers as complete rendered groups: `行 12，列 3`, `区域 1 / 3`, `1 行新增 · 0 行删除`, `123 字节已加载`, theme-limit text around `32`, inherited syntax-theme labels and the linked Chrome permission instructions. Preserve the ASCII opening parenthesis in the inherited-theme prefix because its component supplies the closing `)`. The theme preview's Token column contains semantic color roles, so it uses 颜色标记. Sample filenames and the `docs` folder remain unchanged.

### Website copy

The website uses a friendly `你`, short clauses, and familiar Mainland software terms. Headings can have their own rhythm: “让 Markdown 更好读，也更好用” and “相关资料，一处浏览” connect the reader to practical benefits. Explain outline navigation, file browsing, update comparisons and live preview directly rather than carrying over English metaphors about light or ideas finding a home. Use 扩展程序、工作区、本地处理、浅色/深色主题 and 实时预览 consistently. The experimental editor remains explicitly 实验性. Installation uses Chrome 应用商店; link directly to the published listing, use 添加至 Chrome for the installation action, and retain the file-access setup. Source builds belong only in developer documentation. Preserve all policy qualifications about storage, synchronization, file handles, network and third-party requests, together with the original effective date.

For the website wording, read [Chrome：安装和管理扩展程序](https://support.google.com/chrome/answer/2664769?hl=zh-Hans) for 扩展程序、详情 and 权限, and [Chrome：删除浏览数据](https://support.google.com/chrome/answer/2392709?hl=zh-Hans) for the distinction between browsing records, stored data and permissions. These are terminology comparisons; the final copy follows the actual Markdown Plus behavior.

Also read [Microsoft Word's Chinese product page](https://www.microsoft.com/zh-cn/microsoft-365/word) for the progression from reading/writing benefits to specific functions and concise action headings. Use that as an editorial comparison, not as a source of claims or copied marketing sentences.

### References

The previous Simplified Chinese review recorded reading these localized pages on 2026-10-16. The comparisons below preserve its terminology decisions; they do not assert a new source review whenever this document is edited.

| Official reference | Evidence and decision |
| --- | --- |
| [Word：查找和替换文本](https://support.microsoft.com/zh-cn/word/training/find-and-replace-text-in-word) | The Chinese article uses 查找、替换为、全部替换、区分大小写 and 全字匹配. These fit CodeMirror's search controls. Use 下一处/上一处 consistently for matches instead of mixing page/occurrence terminology. |
| [Chrome：安装和管理扩展程序](https://support.google.com/chrome/answer/2664769?hl=zh-Hans) | Read the management and site-access sections: 设置、扩展程序、详情、权限 and 开启 are familiar browser terms. Native Chrome permission/file/print dialogs follow Chrome's language independently of this preference. |
| [Chrome：删除浏览数据](https://support.google.com/chrome/answer/2392709?hl=zh-Hans) | The article distinguishes removing history entries from other data. Markdown Plus uses 清除最近文件记录 to name the specific list being cleared; this action does not delete local files. |
| [Visual Studio：比较文件](https://learn.microsoft.com/zh-cn/visualstudio/ide/compare-with?view=vs-2022) | The article body, despite an authorization banner, was readable: comparison/difference views, old/new versions, read-only content, added/deleted lines and navigation among changed portions. Use 比较、差异、只读、新增、删除. Avoid awkward machine-translated menu labels in that article. |

## es

Use neutral Spanish, direct action verbs in the infinitive for buttons and a familiar singular voice in guidance. Use sentence case and Spanish opening question marks. Prefer Configuración, archivo, carpeta, espacio de trabajo and Esquema; reserve Índice for the document's table of contents. CodeMirror uses Buscar, Reemplazar por, reemplazar todo, coincidencia and expresión regular. Keep Markdown, Git, Mermaid, Shiki, named fonts, filenames and format identifiers recognizable.

Use Comprobar cambios for checking the open file, rather than Buscar actualizaciones, which can suggest software updates. Use vista previa en tiempo real for live preview and lenguaje for a syntax-highlighting language, reserving idioma for interface languages. Fixed numeric placeholders that do not select plurals can use noun-first labels such as Archivos indexados: {0}, so the wording also works at one. Validation uses El valor de «{0}» debe… to keep inserted field labels grammatical. Image-processing errors should refer to generating or encoding the image at a resolution, rather than encoding the resolution itself.

Descartar cambios means losing unsaved edits; Borrar historial removes remembered paths, while Eliminar is used for removing a custom theme. Abrir versión guardada loads the version already on disk and closes the editor; it does not write over that version. Explain permanent draft loss in the adjacent warning. Use resolución de imagen for raster controls, with Resolución as the compact caption. Use one/other counted messages; quantities that select the Spanish many category use the same plural wording as other.

A file ready for automatic loading has dejado de cambiar, rather than becoming a versión estable. Gesture hints use ajustar el zoom to cover both enlarging and reducing. The reader checkbox is Mostrar índice, while the panel itself remains Esquema.

Website and Store copy use direct benefits and a familiar singular voice. Use copia de seguridad for backups, versión de pago for a paid upgrade, and servidor gestionado por el desarrollador for the precise upload destination. In the guide, quote control names when inserting them into sentences, distinguish ajuste de línea from a literal line break, and keep diacritic matching distinct from removing accent marks. Preserve every privacy condition and the original effective date.

| Official reference read | Terminology comparison |
| --- | --- |
| [Google Docs — Buscar y reemplazar](https://support.google.com/docs/answer/62754?hl=es&co=GENIE.Platform%3DDesktop) | Search/replacement fields, next/previous matches, case sensitivity and regular expressions; use Reemplazar consistently despite the article also using Sustituir. |
| [Chrome — Eliminar los datos de navegación](https://support.google.com/chrome/answer/2392709?hl=es) | Historial, stored data and permissions; name the recent-file list explicitly when clearing it. |
| [Chrome — Instalar y administrar extensiones](https://support.google.com/chrome/answer/2664769?hl=es&co=GENIE.Platform%3DDesktop) | Extensión, Detalles, Activar and permisos. |
| [Visual Studio — Comparación de archivos](https://learn.microsoft.com/es-es/visualstudio/ide/compare-with?view=vs-2022) | The article body was readable despite its authorization banner: comparación, código fuente, versiones and líneas eliminadas. Use bloque modificado for navigable diff areas. |

## de

Use concise infinitives for actions, correctly capitalized German nouns and consistent informal du guidance. Prefer Einstellungen, Datei, Ordner, Arbeitsbereich, Gliederung and Inhaltsverzeichnis. Use Design for application appearance, Codehervorhebung for syntax highlighting, Quelltext for displayed source and Quellcode for the project link. Keep familiar technical names such as Markdown, Git, Mermaid, Shiki, Plugins, Monospace and Live-Vorschau. Search uses Suchen, Ersetzen durch, Treffer, regulärer Ausdruck and Groß-/Kleinschreibung beachten.

Use Datei auf Änderungen prüfen for a file-change check. Name count limits explicitly as maximale Dateianzahl or maximale Ordneranzahl; Dateigrenze can suggest an individual file's size limit. Validation uses Der Wert für „{0}“ muss… so inserted labels do not require matching articles or verb forms. Use einschließlich des ungespeicherten Entwurfs for the search scope, and beim nächsten Scan oder bei der nächsten Aktualisierung der Dateiliste when describing when scan settings apply.

Änderungen verwerfen discards a draft, Abbrechen cancels an operation, and Dateiverlauf leeren removes only remembered entries. Gespeicherte Version laden opens the already-saved external version and closes the editor; it does not write to disk. Keep unwiderruflich in warnings about draft loss. Theme switching uses a colon before the interpolated light/dark name to avoid adjective-case errors. Read concatenated limit and preview sentences as complete German sentences. Counted entries use one/other; Zeichen and Treffer keep the same noun form in both.

Use the accusative in actions such as Dateinamen kopieren and Ordnernamen kopieren. A stable file is described as Die Datei ändert sich nicht mehr, followed by loading the latest Dateistand. Explain synchronization completion directly rather than translating “catches up” literally. The reader checkbox is Inhaltsverzeichnis anzeigen, while the panel remains Gliederung.

Website and Store copy keep the informal du voice and use short benefit headings. A stable file is a Dateistand that has stopped changing, not an unveränderte Version or a stable software release. Explain cached settings, local file references and image deletion in complete sentences. Quote button names to keep their infinitive form grammatical within prose. Preserve every privacy condition and the original effective date.

| Official reference read | Terminology comparison |
| --- | --- |
| [Google Docs — Suchen und ersetzen](https://support.google.com/docs/answer/62754?hl=de&co=GENIE.Platform%3DDesktop) | Suchen, Ersetzen durch, Alle ersetzen, Groß-/Kleinschreibung beachten and reguläre Ausdrücke. |
| [Chrome — Browserdaten löschen](https://support.google.com/chrome/answer/2392709?hl=de&co=GENIE.Platform%3DDesktop) | Einstellungen, Berechtigungen, Verlauf and the distinction between clearing a download list and deleting the files themselves. |
| [Visual Studio — Vergleichen von Dateien](https://learn.microsoft.com/de-de/visualstudio/ide/compare-with?view=vs-2022) | The readable body uses Vergleich, Änderungen, schreibgeschützt and geänderte Abschnitte. Prefer Zeilen for source lines rather than the article's awkward Linien. |

## ja

Use short Japanese action labels without unnecessary する, and polite です／ます guidance. Use Japanese punctuation and familiar terms: 設定, ファイル, フォルダ, ワークスペース, アウトライン, プレビュー, 検索, 置換, すべて置換, 正規表現 and 大文字と小文字を区別. Retain technology names, font names, extensions and keyboard shortcuts. CodeMirror's replacement field is 置換後の文字列, rather than a bare verb that would hide the field's purpose.

Describe the editor's selected original file as 保存先のファイル or 選択した元のファイル; explain missing access directly instead of suggesting that a local file is a device that must be connected. Use {line} 行目 for standalone source locations; the editor status bar retains its fixed label-before-number layout. Quote interpolated validation labels as 「{0}」は… rather than inserting an unnatural space before は. Gradient controls use 始点の色 and 終点の色. Caution is 注意, distinct from 警告 for Warning. A scan that is restarted is 最初からやり直す, rather than 再開する, which suggests resuming an interrupted scan.

Use キャンセル for canceling an operation, 変更を破棄 for losing unsaved edits, and 履歴を消去 for clearing remembered paths. 保存済みの版を開く loads the external version already on disk; warnings explicitly explain that the editor closes and the draft is permanently lost. Use 読み込み for loading and 読み取り for reading file bytes. 描画解像度 is distinct from 拡大・縮小. Counted entries use only other; the runtime retains its existing document word-count algorithm rather than claiming Japanese segmentation support.

Use 変更前／変更後 for the two versions' line numbers in a comparison, with interpolated locations such as 変更後の 12 行目. Count headings as 見出し 3 件. The reader checkbox is 目次を表示, while the panel remains アウトライン. A file ready to load has ファイルの変更が落ち着いた; avoid describing it as a software-style 安定した版.

Read fragment-based controls in their rendered order. CodeMirror's fold announcement uses 折りたたんだ行: 1 〜 3; its structure is controlled by CodeMirror, so avoid an English-shaped sentence with the verb before a trailing range. The scan-limit link continues with してから一覧を更新してください. Keep the ASCII opening parenthesis in the inherited-theme prefix because its consumer adds the closing parenthesis. The theme-limit notice is two complete sentences around its fixed numeric insertion.

Website headings may use short benefit phrases; guide and policy explanations use polite です／ます sentences. Use 同じファイルへの保存 and 元のファイル for editor workflows, keeping export separate. Explain external resources and Chrome synchronization without broad claims of zero communication. In the guide, keep sample filenames and headings literal, identify English screenshots explicitly, and use Japanese control names in the instructions. Preserve every privacy condition and the original effective date.

| Official reference read | Terminology comparison |
| --- | --- |
| [Google Docs — 検索と置換](https://support.google.com/docs/answer/62754?hl=ja) | 検索, 置換, すべて置換, 置換後の文字列, 正規表現 and next/previous occurrence controls. The first desktop URL timed out; this Japanese page was subsequently readable. |
| [Chrome — 閲覧データを削除する](https://support.google.com/chrome/answer/2392709?hl=ja&co=GENIE.Platform%3DDesktop) | 履歴, 設定, 許可 and explicit distinction between removing list entries and keeping actual files. |
| [Visual Studio — ファイルを比較する](https://learn.microsoft.com/ja-jp/visualstudio/ide/compare-with?view=vs-2022) | The readable Japanese body distinguishes 比較, 差分, 読み取り専用, 追加された行 and 削除された行 despite an authorization banner. Use 変更範囲 for navigable changed areas. |

## ro

Use natural Romanian with comma-below ș/ț, sentence case, short imperative actions and consistent informal singular guidance. Prefer Setări, fișier, dosar, spațiu de lucru, Schiță for the outline panel, Cuprins for a table of contents, and previzualizare. Use Caută, Înlocuiește cu, înlocuiește tot, potrivire, expresie regulată and Ține cont de majuscule; keep the last option distinct from diacritic matching. Familiar technical terms such as Markdown, Git, Mermaid, Shiki, pluginuri, clipboard, cache and inline remain recognizable. A browser tab is filă; the editor setting is lățimea tabulatorului.

Use fișier asociat for the editor's file association and fișierul original selectat in save instructions, rather than treating the file as a connected device. Verifică modificările fișierului checks changes to the document rather than a new software release. Încadrare text names editor word wrapping; în mozaic describes a tiled background, avoiding the building-material sense of dale. Zoom guidance should mention both bringing fingers together and moving them apart. Keep count summaries noun-first when the numeric placeholder does not select a plural form. Validation uses Valoarea pentru „{0}” trebuie… so a standalone field label does not need to be inflected as a sentence subject.

Anulează cancels an operation, Renunță la modificări discards unsaved edits, and Șterge istoricul removes remembered paths rather than files. Deschide versiunea salvată loads the external version already on disk and closes the editor. Preserve definitiv in draft-loss warnings. Counted messages use one/few/other: 1 cuvânt, 0/2/19 cuvinte, 20 de cuvinte. For placeholders that do not control plural selection, use a noun-first label such as Fișiere indexate: {0}. This also keeps count summaries natural at zero and larger values. The fixed theme-limit sentence reads Ai atins limita de 32 de teme personalizate.

Describe a file ready for loading as Fișierul nu se mai modifică, avoiding versiune stabilă. Updates preserve conținutul pe care îl editezi rather than “an active editor.” Quote action labels used as grammatical subjects, such as comanda „Salvează”. The reader checkbox is Arată cuprinsul, while the panel remains Schiță.

Website and Store copy use short imperative actions and concrete benefits. Use copie de siguranță for backups, configurațiile temelor for theme definitions in everyday guidance, and factori de scalare for PNG export sizes. Refer to a support request as a tichet or raportarea unei probleme rather than deschiderea unei probleme. Explain that a resolution limit prevents further enlargement, rather than saying an image cannot go up. Preserve every privacy condition and the original effective date.

| Official reference read | Terminology comparison |
| --- | --- |
| [Google Docs — Caută și înlocuiește](https://support.google.com/docs/answer/62754?hl=ro&co=GENIE.Platform%3DDesktop) | Caută, Înlocuiește cu, expresii regulate and navigation through occurrences. Use the concise action înlocuiește tot instead of the article's more formal Înlocuire globală. |
| [Chrome — Șterge datele de navigare](https://support.google.com/chrome/answer/2392709?hl=ro&co=GENIE.Platform%3DDesktop) | Setări, permisiuni, fișier, filă, istoric and the explicit difference between clearing a list and deleting its files. |

A Romanian Visual Studio comparison article could not be accessed, and the Romanian Pro Git v2 URL returned 404. These are not evidence of Romanian developer-tool wording; technical comparison terms follow the actual Markdown Plus behavior and the inspected Romanian document/browser terminology.
