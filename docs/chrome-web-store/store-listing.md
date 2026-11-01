# Store listing copy and reviewer setup

Retained description and reviewer copy prepared for the published 1.0.0 release. See the [release record](./release-1.0.0.md) for confirmed metadata and the limits of the saved dashboard evidence.

## Detailed description

The [plain-text description](./store-description.txt) preserves the public description checked on 2026-11-01, including the one-time file-access setup and privacy URL. Use it as the source for the Store description field.

## Reviewer instructions

After installing Markdown Plus, use a clean Chrome profile with file URL access initially off. Open the popup and Settings → General: both should explain the blocked state and provide access instructions. Click **Open extension details**, enable **Allow access to file URLs**, and return to Settings: its status should update without reopening the Settings page. Reopen the popup and confirm the ready state. Open a local Markdown fixture, verify the Viewer appears, then turn file access off and confirm the blocked state returns when Settings regains focus. Extension pages remain accessible while file access is blocked.

File URL access allows reading local files; editing additionally requires selecting the original file and granting file-system write access. A screenshot showing “Allowed” describes the configured state, not the default state after installation.

## Screenshot scope

The approved screenshots show configured product features. Screenshot 05 must include the actual **File URL access** row and Chrome's setup instructions in its lower-right crop; it must not label the **Enable Markdown Plus** switch as a file permission. The plain-text description supplies the installation steps. The selected image set is cataloged under [approved assets](../../assets/chrome-web-store/README.md); compare it with the installed UI when preparing future updates.
