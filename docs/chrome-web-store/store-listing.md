# Store listing copy and reviewer setup

Prepared for the next submission on **2026-11-09**. These files are proposed upload inputs, not evidence of publication. The last recorded public metadata remains in the [1.0.0 release record](./release-1.0.0.md); Git history preserves the previous description.

## Name and short descriptions

Use **Markdown Plus - Free Markdown Viewer** as the extension name. The Store name comes from `manifest.json → name`; the short description comes from `public/_locales/<locale>/messages.json → extensionDescription.message`. Upload a newly versioned package to change these fields; the runtime product name and toolbar tooltip can remain **Markdown Plus**.

| Listing language | Short description |
| --- | --- |
| English (`en`, default) | Free Markdown viewer and MD reader for Chrome. Open local .md files with themes, syntax highlighting, math, and Mermaid diagrams. |
| Vietnamese (`vi`) | Đọc tệp Markdown (.md) ngay trong Chrome, hoàn toàn miễn phí. Hỗ trợ giao diện tùy chỉnh, tô màu mã, công thức và sơ đồ Mermaid. |
| Simplified Chinese (`zh_CN`) | 完全免费的 Chrome Markdown 查看器和 MD 阅读器。直接打开本地 .md 文件，支持自定义主题、代码高亮、数学公式和 Mermaid 图表。 |

## Detailed descriptions

Copy the complete plain-text file into the Description field for its matching Store language:

- [English](./store-description.txt)
- [Vietnamese](./store-description.vi.txt)
- [Simplified Chinese](./store-description.zh-CN.txt)

Each description uses a short introduction, a vertical feature list, free-use terms, file-access setup, privacy qualifications, an issue-report URL, and a source-code URL. Find/workspace search is deliberately absent while its Store publication remains unverified. The README labels those development features as unreleased. Reconcile these descriptions with the exact package selected for submission.

See the [submission form guide](./submission-form.md) for each Dashboard field, copy-ready permission justifications, URLs, and test instructions.

## Discovery and wording

The primary user needs are Markdown viewing and reading in Chrome. Use `Markdown viewer`, `Markdown reader`, `MD viewer`, and `MD reader` where they describe the product naturally; do not append keyword lists or repeat terms artificially. The full title uses Markdown Viewer, and the English summary also uses MD reader.

Chrome confirms that listing metadata participates in search ranking and describes ratings and installation/uninstallation statistics among ranking factors, but does not publish field weights or an MD/Markdown synonym guarantee. No title or description can promise a top search position. These choices prioritize accurate matching and readable feature discovery.

Official references consulted on 2026-11-09: [Discovery](https://developer.chrome.com/docs/webstore/discovery), [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing), and [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements).

## Reviewer instructions

No account, password, subscription, or payment is required. Use the copy-ready [Test instructions](./submission-form.md#test-instructions) when submitting.

After installing Markdown Plus, use a clean Chrome profile with file URL access initially off. Open the popup and Settings → General: both should explain the blocked state and provide access instructions. Click **Open extension details**, enable **Allow access to file URLs**, and return to Settings: its status should update without reopening the Settings page. Reopen the popup and confirm the ready state. Open a local Markdown fixture, verify the Viewer appears, then turn file access off and confirm the blocked state returns when Settings regains focus. Extension pages remain accessible while file access is blocked.

File URL access allows reading local files; editing additionally requires selecting the original file and granting file-system write access. A screenshot showing “Allowed” describes the configured state, not the default state after installation.

## Screenshot scope

The selected screenshots show configured product features. Screenshot 05 must include the actual **File URL access** row and Chrome's setup instructions in its lower-right crop; it must not label the **Enable Markdown Plus** switch as a file permission. The plain-text descriptions supply the installation steps. The selected image set is cataloged under [approved assets](../../assets/chrome-web-store/README.md); compare it with the exact installed candidate when preparing an update.
