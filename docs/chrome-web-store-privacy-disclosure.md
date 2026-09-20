# Chrome Web Store Privacy Disclosure

Use this document when completing the Chrome Web Store Privacy practices form.
It is a submission aid, not the public privacy policy.

## Public URLs

- Privacy policy:
  `https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/`
- Homepage:
  `https://thaibalong7.github.io/markdown-viewer-chrome-extension/`
- Support:
  `https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues`
- Source:
  `https://github.com/thaibalong7/markdown-viewer-chrome-extension`

The Pages URL becomes public after this change reaches `main`, the deployment
workflow succeeds, and GitHub Pages is configured to use **GitHub Actions** as
its source in the repository settings.

## Single purpose

> A private local Markdown workspace for reading, navigating, editing, and
> exporting documents in Chrome.

## Data-use declaration

Markdown Plus processes local document content, file names, file URLs/paths,
and user preferences only to provide its user-facing features. This information
is not transmitted to the developer or a developer-operated server.

When the current Store form asks whether the extension **collects** user data,
answer consistently with the form's definition of collection/transmission:

- Local document or website content: processed on-device; not collected or
  transmitted to the developer.
- Browsing history: not collected. Recent history is restricted to local
  `file:` Markdown URLs and stays in `chrome.storage.local`.
- User activity, personal communications, location, financial information,
  health information, authentication information, personal identifiers: not
  collected.
- Preferences: stored through Chrome storage for the extension's settings;
  Chrome may sync them through the user's signed-in Chrome profile.
- File handles: may be retained locally in browser IndexedDB after the user
  selects a file for saving.

Certifications should state that data is not sold, used for advertising, used
for creditworthiness or lending, or transferred for purposes unrelated to the
extension's single purpose.

## Network behavior to disclose

Do not claim that the extension makes zero network requests:

- User-authored Markdown may reference remote images or resources, which Chrome
  can request directly from the referenced host.
- Exported HTML or Word-compatible documents containing Math currently link to
  KaTeX CSS on `cdn.jsdelivr.net`; opening an export while online can contact
  jsDelivr.
- Following an external link contacts the destination only after user action.

None of these requests send document content to a Markdown Plus-operated
server.

## Permission justifications

- `storage`: Stores reader, editor, explorer, theme, and plugin preferences.
  Recent local file paths are kept separately in `chrome.storage.local`.
- `offscreen`: Reads local `file:` documents and directory listings used by the
  Files explorer.
- `downloads`: Saves HTML, Word-compatible, and Mermaid image exports and
  provides a save fallback when direct file writing is unavailable.
- `file:///*`: Recognizes, reads, and displays local supported documents. The
  user must separately enable **Allow access to file URLs** in Chrome.

## Final dashboard check

Before submitting, compare every selected Store checkbox with the deployed
policy and the release candidate's `manifest.json`. Re-check this document if
storage behavior, permissions, remote-resource handling, analytics, or any
developer-operated service changes.
