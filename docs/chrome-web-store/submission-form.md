# Chrome Web Store submission form

Reference for **1.0.1**, released on **2026-11-10**, for the existing item `afbdmkpldpbkmmhejjlajocpneaiipmk`. See the [release record](./release-1.0.1.md). The field-by-field instructions below remain a reusable guide for future updates, not a saved Dashboard export.

## Package

Open the existing Markdown Plus item and choose **Package → Upload new package**. Do not create a second Store item.

| Field | Value / action |
| --- | --- |
| ZIP file | A newly built release ZIP containing the updated manifest and native locale metadata. Follow [Building a release](../releasing.md); do not reuse an older ZIP. |
| Version | Taken from the ZIP's `manifest.json → version`. Increase it above the currently published version before packaging; the current released version is `1.0.1`. |
| Name / title | `Markdown Plus - Free Markdown Viewer`, read from the uploaded manifest. |
| Short description / summary | Read from the uploaded `_locales/<locale>/messages.json`; use the values below to verify the preview. |

Release 1.0.1 includes Find/workspace search and all seven interface languages.

## Store listing

| Field | Value / action |
| --- | --- |
| Default language | English (`en`). |
| English summary | Free Markdown viewer and MD reader for Chrome. Open local .md files with themes, syntax highlighting, math, and Mermaid diagrams. |
| Vietnamese summary | Đọc tệp Markdown (.md) ngay trong Chrome, hoàn toàn miễn phí. Hỗ trợ giao diện tùy chỉnh, tô màu mã, công thức và sơ đồ Mermaid. |
| Simplified Chinese summary | 完全免费的 Chrome Markdown 查看器和 MD 阅读器。直接打开本地 .md 文件，支持自定义主题、代码高亮、数学公式和 Mermaid 图表。 |
| Spanish summary | Visor Markdown gratuito para Chrome. Abre archivos .md locales con temas, resaltado de código, fórmulas y diagramas Mermaid. |
| German summary | Kostenloser Markdown-Viewer für Chrome. Lokale .md-Dateien mit Designs, Codehervorhebung, Formeln und Mermaid-Diagrammen öffnen. |
| Japanese summary | Chrome 用の無料 Markdown ビューア。ローカルの .md ファイルを開けます。テーマ、コードハイライト、数式、Mermaid の図に対応しています。 |
| Romanian summary | Vizualizator Markdown gratuit pentru Chrome. Deschide fișiere .md locale cu teme, evidențierea codului, formule și diagrame Mermaid. |
| Description — English | Paste all of [store-description.txt](./store-description.txt). |
| Description — Vietnamese | Select Vietnamese, then paste all of [store-description.vi.txt](./store-description.vi.txt). |
| Description — Simplified Chinese | Select Simplified Chinese, then paste all of [store-description.zh-CN.txt](./store-description.zh-CN.txt). |
| Description — Spanish | Select Spanish, then paste all of [store-description.es.txt](./store-description.es.txt). |
| Description — German | Select German, then paste all of [store-description.de.txt](./store-description.de.txt). |
| Description — Japanese | Select Japanese, then paste all of [store-description.ja.txt](./store-description.ja.txt). |
| Description — Romanian | Select Romanian, then paste all of [store-description.ro.txt](./store-description.ro.txt). |
| Category | Keep the current **Tools** category under **Productivity**, as recorded for the published listing. |
| Homepage URL | https://thaibalong7.github.io/markdown-viewer-chrome-extension/ |
| Support URL | https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues |
| Official URL | Keep the existing verified site if one is already configured; this is separate from Homepage URL and requires ownership verification. |
| Mature content | No; the extension does not provide mature content. |
| Store icon | [icon-128.png](../../assets/chrome-web-store/icon-128.png). |
| Screenshots | Keep the five selected screenshots in the order below after comparing them with the candidate. |
| Small promo tile | [small-promo-tile.png](../../assets/chrome-web-store/small-promo-tile.png), if updating this optional asset. |
| Marquee image | [marquee.png](../../assets/chrome-web-store/marquee.png), if updating this optional asset. |
| Promotional video | Leave empty if there is no actual product video. |

Keep this screenshot order:

1. [01-open-local-markdown.png](../../assets/chrome-web-store/01-open-local-markdown.png)
2. [02-themes-for-focus.png](../../assets/chrome-web-store/02-themes-for-focus.png)
3. [03-rich-markdown.png](../../assets/chrome-web-store/03-rich-markdown.png)
4. [04-preview-zoom-export.png](../../assets/chrome-web-store/04-preview-zoom-export.png)
5. [05-make-it-yours.png](../../assets/chrome-web-store/05-make-it-yours.png)

After uploading a package containing `_locales/en`, `vi`, `zh_CN`, `es`, `de`, `ja`, and `ro`, select each matching language in the Store listing dropdown and paste its description. The runtime language code `zh-CN` maps to Chrome's `zh_CN` directory. Check each localized preview before saving. These seven listings match the interface languages in the current source; they are included in the 1.0.1 release.

There is no separate source-code URL needed for this proposal: the full GitHub repository URL is included in all seven detailed descriptions. The Support URL points directly to issues. The four new descriptions link to their matching localized privacy pages. Publish and verify those website pages before using the URLs in a Store submission.

## Privacy practices

These prepared values follow the existing [privacy disclosure reference](./privacy-disclosure.md). The metadata update adds no permissions or data handling. Verify the selections against the exact release candidate if it includes other work.

**Single purpose description**

```text
A private local Markdown workspace for reading, navigating, editing, and exporting documents in Chrome.
```

**storage justification**

```text
Stores interface-language, reader, editor, explorer, theme, and plugin preferences. Preferences and custom-theme definitions may sync through Chrome. Recent local file paths are stored separately on the current device in chrome.storage.local.
```

**offscreen justification**

```text
Uses a packaged offscreen document to read local file: documents and directory listings for the Files explorer.
```

For 1.0.1 and later packages containing Find/workspace search, use this expanded offscreen justification:

```text
Uses a packaged offscreen document to read local file: documents and directory listings for the Files explorer, and to create a packaged local Worker for searching supported text files in the user's selected folder/workspace. Matching and temporary content caches remain on the device.
```

**downloads justification**

```text
Saves user-requested HTML, Word-compatible .doc, and Mermaid SVG/PNG exports through Chrome's downloads API. Editor Save writes to the original file explicitly selected by the user and does not use a download fallback.
```

**Host permission justification — file:///**

```text
Recognizes, reads, and displays supported local documents and browses the user's selected local folders. Users must separately enable Allow access to file URLs in Chrome. Editing additionally requires selecting the original file and granting write permission.
```

**Remote code**

Select **No, I am not using remote code** for the bundled runtime described in the privacy reference. If an explanation field is available:

```text
Extension JavaScript, renderers, fonts, and styles are packaged locally. User documents may reference remote images, and exported math documents may reference external KaTeX CSS; these are resource requests, not remotely executed extension JavaScript.
```

**Data usage**

Keep the existing **Web history** and **Website content** disclosures for local paths/recent-file history and document contents. Do not select “no data” simply because there is no developer upload. The disclosure reference explains the mapping and qualifications; no additional category is introduced by this metadata change.

Retain the three certifications that data is not sold/transferred outside approved use cases, not used/transferred for purposes unrelated to the extension's single purpose, and not used/transferred for creditworthiness or lending decisions.

**Privacy policy URL**

```text
https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/
```

## Test instructions

**Credentials / test account:** leave username and password fields empty; no login is required.

**Instructions:** paste the following.

```text
No account, subscription, payment, or test credentials are required.

1. Install the submitted package in Chrome 116 or newer.
2. Open the extension popup and Settings > General. With file URL access disabled, confirm that the extension explains how to enable it.
3. Open chrome://extensions, locate Markdown Plus - Free Markdown Viewer, select Details, and enable Allow access to file URLs.
4. Return to Settings and reopen the popup to confirm file access is ready.
5. Create a local .md file containing a heading, paragraph, fenced code block, table, and Mermaid block. Open or reload it in Chrome. Confirm formatted rendering and heading outline navigation.
6. Open a folder through Files and switch between supported documents. Change a reading theme and confirm the document updates.
7. In Settings > General > Interface language, try English, Vietnamese, Simplified Chinese, Spanish, German, Japanese, and Romanian. Confirm that Settings, the popup, and Viewer controls change language while document content stays unchanged. Select Browser language to verify automatic selection with English fallback. Chrome's native dialogs follow Chrome's language separately.
8. Optional: enable the experimental editor, select the exact original .md file, and grant write permission before saving. Editing is off by default. Change the interface language while editing and confirm the draft and undo history are preserved.
9. Turn file URL access off and return to Settings. Confirm the blocked state is shown again.
```

These are instructions for reviewers, not a claim that manual browser QA has already passed for a new package.

## Distribution and submission

| Field | Value / action |
| --- | --- |
| Visibility | Keep the existing public listing. |
| Regions | Keep the existing distribution regions unless intentionally changing availability. |
| Pricing, if shown | Free. There is no subscription or paid upgrade. |
| Publish automatically after review | Enable to publish when approved; disable to choose a later manual publication time. |
| Submit for review | Use after uploading the versioned ZIP, saving localized descriptions, and checking the preview and disclosures. |

For future releases, record the released version/date and saved Dashboard changes in a new release record. Release 1.0.1 is closed as published on November 10, 2026.

## Official form references

- [Listing fields and localized descriptions](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy fields and permission justifications](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Updating an existing item and its package](https://developer.chrome.com/docs/webstore/update)
- [Test instructions and publishing options](https://developer.chrome.com/docs/webstore/publish)
