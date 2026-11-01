# Chrome Web Store Privacy Disclosure

Use this document when completing the Chrome Web Store Privacy practices form. It is a submission aid, not the public privacy policy.

## Public URLs

- Privacy policy: `https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/`
- Homepage: `https://thaibalong7.github.io/markdown-viewer-chrome-extension/`
- Support: `https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues`
- Source: `https://github.com/thaibalong7/markdown-viewer-chrome-extension`

The public EN/VI/中文 policies were fetched successfully on October 30, 2026 and matched their local `site/**/privacy/index.html` sources byte-for-byte. The deployed text includes the October 30 effective date, Chrome Sync recovery cache, device-local image deletion/replacement/reset, Editor Save without a download fallback, and Limited Use. Deployment is verified; dashboard selections and candidate QA remain separate gates.

## Single purpose

> A private local Markdown workspace for reading, navigating, editing, and exporting documents in Chrome.

## Data-use declaration

Markdown Plus processes local document content, file names, file URLs/paths, and user preferences only to provide its user-facing features. This information is not transmitted to the developer or a developer-operated server.

Disclose on-device handling as well as transmission. The [Chrome User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) explicitly requires disclosure even when data is processed or stored only locally. “Not sent to the developer” is a statement about the destination, not a reason to omit a data category. The previous dashboard inspection stopped at developer registration, so its item-level field definitions and saved selections have not been verified; compare them with this inventory before saving the form. Follow the [submission guide](./submission-guide.md) for account and dashboard steps.

| Data handled | Actual use and destination | Dashboard mapping to review |
| --- | --- | --- |
| Local document text, markup, images, and user-selected theme images | Read/render/edit/export documents and display themes on the user's device; no developer upload. | Review **Website content** against the form's definition of text, images, and hyperlinks. Disclose local handling in the description even if the form uses different terminology for local documents. |
| Local file URLs, names, paths, and last-opened times | Navigation and optional recent-file history in `chrome.storage.local`; no general web-browsing history or synced recent paths. | Review **Web history** against the form's URL/resource definition; do not answer “none” solely because these URLs use `file:`. |
| Preferences and custom-theme names/descriptors | Chrome Sync and local recovery cache, as detailed below; image binaries stay local. | Describe Chrome-managed synchronization, including user-entered theme names. Do not imply that all extension data stays on one device. |
| User-selected file handles | Browser IndexedDB for reconnecting the original file for editing; Chrome controls permission. | Explain the local persistence and purpose; no credentials or filesystem handles are uploaded to the developer. |

The extension has no dedicated collection feature for personal identifiers, health, financial/payment information, authentication information, personal communications, location, or activity telemetry. A document can contain sensitive information; it is still handled as document content. Do not promise that user documents cannot contain those data types, or select every category merely because arbitrary document text could contain it. Resolve the category selections against the live form before submission.

Storage details:

- Preferences and custom theme descriptors: stored in separate Chrome Sync items; Chrome may sync them through the user's signed-in Chrome profile. Failed sync writes do not silently switch to local storage. A verified complete-settings recovery cache is stored in `chrome.storage.local`; if the sync API does not exist, local storage is the settings backend.
- Custom theme background images: chosen by the user and stored as Blobs in browser IndexedDB on the current device. Chrome Sync stores the theme's image reference and presentation settings, not the binary image. The image may be unavailable on another device; the user must choose a local image there. These images are not uploaded to the developer or a developer-operated service.
- Background-image deletion: after a successful theme save, replacing the image or choosing a non-image background removes the superseded asset. Deleting a custom theme removes its image; resetting settings clears the theme-image store. Cleanup errors can leave an unused local image; clearing extension site data or uninstalling removes extension-managed data according to Chrome's behavior. Original documents and exports are not deleted by these actions.
- File handles: may be retained locally in browser IndexedDB after the user selects a file for saving.

Certifications should state that data is not sold, used for advertising, used for creditworthiness or lending, or transferred for purposes unrelated to the extension's single purpose.

## Network behavior to disclose

Do not claim that the extension makes zero network requests:

- User-authored Markdown may reference remote images or resources, which Chrome can request directly from the referenced host.
- Exported HTML or Word-compatible documents containing Math currently link to KaTeX CSS on `cdn.jsdelivr.net`; opening an export while online can contact jsDelivr.
- Following an external link contacts the destination only after user action.

None of these requests send document content to a Markdown Plus-operated server.

## Permission justifications

- `storage`: Stores reader, editor, explorer, theme, and plugin preferences. Recent local file paths are kept separately in `chrome.storage.local`.
- `offscreen`: Reads local `file:` documents and directory listings used by the Files explorer.
- `downloads`: Saves user-requested HTML, Word-compatible, and Mermaid SVG/PNG exports through Chrome's downloads API. Editor Save writes only through the original file handle explicitly connected by the user; there is no download fallback for saving edits.
- `file:///*`: Recognizes, reads, and displays local supported documents. The user must separately enable **Allow access to file URLs** in Chrome.

## Final dashboard check

Single purpose: use the statement above. Remote code: **No, I am not using remote code** for the current packaged runtime; JavaScript, renderers, and extension fonts/styles are bundled. User-authored image URLs and KaTeX CSS referenced by exported files are network/resource disclosures, not remotely executed extension JavaScript.

Copy-ready Store description and reviewer onboarding steps are in [store-listing.md](./store-listing.md). Record the live dashboard's selected categories, permission justifications, candidate manifest/version, and save result in [privacy-permissions-verification.md](./privacy-permissions-verification.md); this document does not certify that dashboard fields have been saved.

Before submitting, compare every selected Store checkbox with the deployed policy and the release candidate's `manifest.json`. Re-check this document if storage behavior, permissions, remote-resource handling, analytics, or any developer-operated service changes.
