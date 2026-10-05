# Document Updates and Change Review

Markdown Plus can keep the active Markdown document synchronized with changes made by an external editor, script, Git operation, or coding agent. Document Updates detects a newer disk revision without reloading the page, while Change Review explains the source lines and sections that changed before or after that revision is applied.

## Availability and scope

- Watch applies only to the active Markdown document. It does not watch the complete workspace, referenced images or assets, or non-Markdown documents opened from Files.
- Direct `file:` Markdown documents and workspace files backed by a `FileSystemFileHandle` can be reread. A workspace opened through the `webkitdirectory` snapshot fallback cannot provide live rereads; select the folder again to regain a current snapshot.
- Checks run only while the Viewer tab is visible. Returning to a visible tab triggers an immediate check when the selected mode permits automatic checks.
- Revision sources and the most recent review pair stay in the current tab's memory. Markdown Plus does not persist document source history.
- The feature adds no network service, dependency, or extension permission. Local source remains inside the browser.

## Choose an update mode

Open **Settings → General → Document updates** and choose one of these modes:

| Mode | Behavior |
| --- | --- |
| **Ask before updating** | Default. Markdown Plus checks the active document and keeps the current article until you choose **Update document**. A dot and a short-lived **New version available** bubble announce the first pending revision. |
| **Update automatically** | Applies a stable revision in read mode after recent reading input stops. Automatic replacement is deferred while you scroll, type, hold a pointer, edit, or save. A persistent text selection, article focus, or open Document Updates panel does not block an otherwise idle update indefinitely. |
| **Off** | Stops background polling. **Check now** remains available for an explicit one-time check and can still produce a reviewable pending revision. |

Background checks normally run about every two seconds. Ask/manual checks confirm a changed source with another read after about 400 ms. Automatic checks use a longer 1.5-second confirmation, wait for 1.5 seconds of reading inactivity, and limit automatic article replacement to once every five seconds. These checks reduce partially written renders but cannot prove that an external writer has completed a transaction.

## Check and apply a revision

The **Document updates** action is in the Viewer action rail. In its normal state, the document-and-clock icon opens a status panel with the current mode and **Check now**. When Ask or a manual Off check finds a revision in read mode, or when an automatic update has been deferred by recent activity, the control becomes a one-click **Update document** action and uses a document-and-download icon.

Applying a revision rereads the current disk source instead of trusting an older notification. It updates the article in place without navigating, changing browser history, rescanning Files, or replacing the document identity. Automatic applies do not show a success toast; an explicit update does.

Markdown Plus keeps the current article when a read fails, the file temporarily disappears, permission is lost, or the source exceeds the Watch limit. The panel reports a recoverable error and offers **Try again**. Repeated background failures back off to at most 30 seconds between checks. An empty file is a valid Markdown revision.

## Review what changed

When a comparison is available, **View changes** appears beside Document Updates. The review opens lazily and includes:

- Added and removed line counts plus the number of changed areas.
- Old and new source line numbers, addition/removal markers, line-ending annotations, and three context lines around each area.
- Affected Markdown sections derived from parser tokens, including Setext headings and duplicate headings while excluding heading-like text inside fenced or indented code.
- **Previous area** and **Next area** controls; `Alt+↑` and `Alt+↓` move between changed areas in the current comparison.
- **Open document** for a surviving section only when the reviewed new source is the source currently rendered in read mode.

Ask and Off compare the accepted article source with the pending disk source. Automatic mode keeps the before/after pair from the most recent applied external update. Edit mode compares the accepted disk baseline with the pending disk source and deliberately excludes the editor draft.

Opening the panel pins its comparison. Later disk writes do not silently replace the diff; the panel reports that a newer comparison is ready and waits for **Review latest**. **Update document** still performs a fresh disk read, so the applied source can be newer than the pinned comparison.

Review source is rendered as text by React rather than inserted as HTML. Closing with **Close**, `Escape`, or an outside press returns focus to **View changes**. The dialog contains keyboard focus while open, and reduced-motion preferences disable decorative motion.

## Editor and save safety

Watch never automatically replaces an active editor. When disk changes during editing, the draft and its dirty state stay intact and Change Review excludes draft text.

Loading the disk revision requires an explicit confirmation that edit mode will close. A dirty draft receives a destructive warning that its unsaved changes will be permanently discarded; canceling returns to the editor unchanged. Save-time conflict detection remains authoritative and refuses to overwrite a disk source that changed externally. A successful internal Save advances the accepted baseline with the exact source written and does not create a false external-update notification.

## Reading continuity

An in-place update captures the nearest heading and text, the offset within that section, and the document scroll ratio as a fallback. Restoration stops if the user continues navigating during render, and a short resize-observation window adjusts for late layout changes such as images or diagrams. The existing Outline remains visible until the replacement Outline is ready.

## File list refresh is separate

**Refresh file list** in Files only rescans the current folder or workspace. It does not reread the article, apply a pending Markdown revision, discard a draft, reset the route, or fall back to the entry document when the current file is missing from the refreshed tree. Use Document Updates to check or apply the active Markdown source.

## Limits and intentional exclusions

Watch accepts Markdown source up to 5 MiB. Detailed Change Review accepts at most 512 Ki UTF-16 code units and 20,000 lines per source, one million diff work steps, an 80 ms cooperative calculation budget, and 2,000 output rows. If a comparison exceeds a limit, the panel recommends an external diff tool and preserves the article and draft instead of presenting a truncated diff as complete.

Document Updates and Change Review do not provide three-way merge, draft-versus-disk diff, force overwrite, long-lived source history, annotations, or whole-workspace watching. Save conflict protection is never bypassed.

## Implementation map

| Responsibility | Source |
| --- | --- |
| Disk baseline, revision ids, previous accepted source | `src/viewer/app/documentSessionController.js` |
| Polling, confirmation, pending state, retries, apply coordination | `src/viewer/app/watchSessionController.js` |
| Reading/input deferral | `src/viewer/app/readingActivityGuard.js` |
| Position capture and restoration | `src/viewer/navigation/reading-position.js` |
| Document Updates UI and editor confirmation | `src/viewer/react/components/WatchStatus.jsx`, `EditorUpdateConfirmation.jsx` |
| Review pair pinning and bounded diff | `src/viewer/review/` |
| Review dialog and navigation | `src/viewer/react/components/ChangeReview.jsx`, `ChangeReviewPanel.jsx` |
| Mode defaults and validation | `src/settings/default-settings.js`, `settings-schema.js` |
| General settings control | `src/options/sections/GeneralSettings.jsx` |

Architecture and ownership details live in [Architecture Overview](./architecture-overview.md). The current browser checklist for the not-yet-completed Change Review UI smoke test remains in [`planning/product-feature-roadmap/watch-mode-change-review-manual-test.md`](../planning/product-feature-roadmap/watch-mode-change-review-manual-test.md).
