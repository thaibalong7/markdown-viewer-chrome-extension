# Store listing copy and reviewer setup

Prepared October 30, 2026 for the current runtime. This is copy-ready source, not evidence that a Store listing has been saved or published.

## Detailed description

Markdown Plus turns local Markdown files into a document workspace in Chrome. Read with an outline, syntax highlighting, math, tables, and Mermaid diagrams. Browse related documents and images in the Files explorer, choose a built-in theme or create your own, and export your work.

Enable the experimental editor to edit Markdown with a live preview. Before editing, connect the original file and grant Chrome permission to write it. Save updates that connected file and checks for external changes; it does not silently download a replacement copy.

Export documents as HTML or Word-compatible files, export Mermaid diagrams as SVG or PNG, or use Chrome's print dialog to save a PDF.

### One-time local file setup

1. Install Markdown Plus, then open its toolbar popup.
2. Click **Open extension details**, or open `chrome://extensions`, find Markdown Plus, and select **Details**.
3. Enable **Allow access to file URLs**. Chrome controls this setting; Markdown Plus cannot enable it automatically.
4. Reopen the popup or return to Settings to confirm that file access is ready. Open or reload a local `.md` file in Chrome.

Document content is processed in your browser and is not uploaded to a developer-operated server. Preferences may sync through your signed-in Chrome account. Recent-file paths and custom background-image files stay on the current device. Documents can load remote images, and exported math documents can reference external CSS. Read the [privacy policy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/) for storage details and controls.

## Reviewer instructions

Use a clean Chrome profile with the unpacked release candidate and file URL access initially off. Open the popup and Settings → General: both should explain the blocked state and provide access instructions. Click **Open extension details**, enable **Allow access to file URLs**, and return to Settings: its status should update without reopening the Settings page. Reopen the popup and confirm the ready state. Open a local Markdown fixture, verify the Viewer appears, then turn file access off and confirm the blocked state returns when Settings regains focus. Extension pages remain accessible while file access is blocked.

File URL access allows reading local files; editing additionally requires selecting the original file and granting file-system write access. A screenshot showing “Allowed” describes the configured state, not the default state after installation.

## Screenshot scope

The approved screenshots show configured product features. Screenshot 05 must include the actual **File URL access** row and Chrome's setup instructions in its lower-right crop; it must not label the **Enable Markdown Plus** switch as a file permission. The written one-time setup above supplies the installation steps. All five screenshots still need final visual comparison with the ZIP candidate before Store upload.
