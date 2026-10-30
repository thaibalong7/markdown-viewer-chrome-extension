# Localization writing guide

This is the shared editorial reference for Markdown Plus interface translations: how to write labels and messages, which terms each locale uses, and why those choices fit the product. It is intended for contributors and translation reviewers. The actual translations live in `src/i18n/locales/*.json` and Chrome metadata in `public/_locales/`; website copy lives in `scripts/site/locales/`. This document is not a translated user manual or a copy of those catalogs.

Read [Interface languages](./internationalization.md) for runtime ownership, locale selection, integration, and verification. The [mdp-dev-add-language skill](../.agents/skills/mdp-dev-add-language/SKILL.md) owns the complete language-addition workflow.

## Maintaining this guide

Use one shared guide with a section for each locale that needs recorded editorial decisions. When adding a language, extend this file with its canonical locale code, tone/punctuation conventions, ambiguous or recurring terminology, context-sensitive exceptions, and references actually read. A locale does not require a separate Markdown file. Keep full message catalogs in JSON and avoid documenting every translated label here.

Keep technical behavior and the common test matrix in [Interface languages](./internationalization.md). Report review coverage, test/build results, bundle comparisons, and remaining manual checks in the task or pull request that performed them. Those results describe a particular revision; do not retain dated pass counts or completion tables as current language guarantees. Git history retains previous reports.

| Locale | Editorial decisions |
| --- | --- |
| `en` | English is the extension’s source catalog; website copy follows the independent editorial approach below. |
| `vi` | [Tiếng Việt](#vi) |
| `zh-CN` | [简体中文（中国）](#zh-cn) |

## Shared writing principles

- Write for the action and result the user needs. Prefer concrete, familiar verbs, concise control labels, and descriptions that explain scope or consequences.
- Translate the meaning in its actual context. Read neighboring labels, hints, accessible names, confirmations, and loading/error states together; avoid importing English word order into another language.
- Preserve conditions, limits, permissions, and warnings. Distinguish clearing recent history from deleting files, canceling a dialog from discarding changes, and loading a saved version from overwriting an unsaved draft.
- Keep names, filenames, paths, URLs, code identities, keyboard shortcuts, extensions, and technical units recognizable. JSON values `true` and `false` remain literal in settings-validation errors. Document bodies, drafts, diffs, and copied/exported source remain literal under the [i18n contract](../.agents/rules/35-internationalization.md).
- Preserve `{name}`, `{0}`, and CodeMirror `$` markers. Read complete messages with real interpolation values, including Unicode, long filenames, key-like text, and zero/one/many counts. Use the runtime's locale-aware number/date formatting and appropriate plural forms.
- Use a consistent term for the same meaning, with context-specific exceptions when needed. Do not impose one locale's vocabulary on another; compare established tools in the target language.
- Review every new locale in two passes: meaning/behavior first, then natural wording in context. Automated parity checks do not establish language quality or visual fit; use the [verification matrix](./internationalization.md#translation-review-and-verification). Machine-generated copy remains a draft until reviewed; identify AI review accurately and claim native-speaker review only when a person performed it.

## Website writing

Website editions are written for their own readers. The English site supplies message keys and markup placeholders, but its sentences and metaphors are not mandatory templates for Vietnamese or Chinese marketing copy. Lead with the practical reading experience, then support it with concrete capabilities: outline navigation, syntax highlighting, math/Mermaid, related-file browsing, update comparisons, custom themes, and optional editing/export. Use concise headings and clear installation actions. Avoid sweeping completeness claims or invented outcomes. User installation uses Chrome Web Store; while the listing is pending review, disclose that status and link to the README Quick start rather than imply it is already available. Keep the editor labeled experimental, distinguish Word-compatible export from PDF through Chrome printing, and retain the local-processing policy's network qualifications. Privacy messages may be rewritten for clarity, but their conditions, disclosures, and effective date must stay equivalent.

English uses short, direct benefit statements such as “Your Markdown. A better read.” and follows them with actual features. Prefer specific actions such as installing from Chrome Web Store and enabling file URL access over installation metaphors. Source builds and unpacked loading belong in developer setup and release QA, not public installation instructions. Keep source examples, filenames and technical identifiers literal across all editions.

## vi

### Tone and context

Use active voice, familiar words, and concrete verbs such as “Mở” (Open), “Chọn” (Select), “Lưu” (Save), “Sao chép” (Copy), and “Thu gọn” (Collapse). Avoid literal English constructions such as “phiên bản sẽ được áp dụng”, “bề mặt nội dung”, or “ngữ cảnh Chrome” when more specific wording is available. Read Vietnamese sentences independently, then alongside neighboring controls.

“Xóa danh sách” removes only remembered entries; “Ghi nhớ tệp đã mở” does not mean creating file copies. Distinguish “Hủy” (cancel the current operation) from “Bỏ thay đổi” (discard edits). Do not shorten warnings until this distinction is lost.

Use “Mở bản đã lưu” when loading content already written to disk. Descriptions must explain that the file changed outside Markdown Plus and whether the current draft will be replaced. For editing permissions, explain selecting the correct original file and granting save access; “Kết nối tệp” should not be the main user-facing explanation.

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

The Home page uses a friendly, natural voice: “Mở Markdown. Đọc thật thoải mái.” and “Giao diện theo gu của bạn.” Descriptions explain concrete benefits through outlines, file trees, syntax highlighting, change comparisons, and editing with live preview. Prefer “tệp trên máy”, “giao diện sáng/tối”, and “xem phần thay đổi”; avoid metaphors about light, homes, or ideas when they do not explain the product. Installation uses Chrome Web Store and file-access permission; while approval is pending, state that clearly and direct readers to the README Quick start for availability. Source-build instructions belong only in developer documentation. The policy uses clear sentences explaining where data is stored and when network connections occur, preserving every qualification in the original.

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

Read existing fragment-based consumers as complete rendered groups: `行 12，列 3`, `区域 1 / 3`, `1 行新增 · 0 行删除`, `123 字节已加载`, theme-limit text around `32`, inherited syntax-theme labels and the linked Chrome permission instructions. Preserve the ASCII opening parenthesis in the inherited-theme prefix because its component supplies the closing `)`. The theme preview's Token column contains semantic color roles, so it uses 颜色标记. Sample filenames and the `docs` folder remain unchanged.

### Website copy

The website uses a friendly `你`, short clauses, and familiar Mainland software terms. Headings can have their own rhythm: “让 Markdown 更好读，也更好用” and “相关资料，一处浏览” connect the reader to practical benefits. Explain outline navigation, file browsing, update comparisons and live preview directly rather than carrying over English metaphors about light or ideas finding a home. Use 扩展程序、工作区、本地处理、浅色/深色主题 and 实时预览 consistently. The experimental editor remains explicitly 实验性. Installation uses Chrome 应用商店; while review is pending, state 正在审核中 and link to the README Quick start for availability and setup. Source builds belong only in developer documentation. Preserve all policy qualifications about storage, synchronization, file handles, network and third-party requests, together with the original effective date.

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
