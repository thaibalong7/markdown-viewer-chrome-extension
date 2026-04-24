# Install Guide

This nested file is used to verify relative navigation into a subfolder.

## Step 1

Open this file from the main sample document and confirm the viewer keeps its shell state.

### Step 1.1 Preconditions

Before continuing:
- ensure the main sample file is open in Markdown Plus
- click into this file via a relative link, not by manual URL edit
- keep the sidebar visible to confirm state persistence

### Step 1.2 Quick Verification

After opening this file, confirm:
1. No full-page reload happened.
2. The document title updates to the current file.
3. Scrolling works smoothly.

## Step 2

This heading is the target for `./guides/install.md#step-2`.

### Step 2.1 Hash Target Validation

When opening `./guides/install.md#step-2`:
- the viewer should land near this section
- content above should be skipped by initial scroll
- no new tab should appear

### Step 2.2 Additional Anchor Targets

Use these internal anchors to test in-document hash navigation after file switch:
- [Go to Step 3](#step-3)
- [Go to Troubleshooting](#troubleshooting)
- [Go to Final Notes](#final-notes)

## Step 3

This section is intentionally placed lower to create more distance for scroll tests.

Long-form text block:

Curabitur tristique velit eu mi volutpat, ut ultricies lorem convallis. Integer vitae orci vitae turpis congue aliquet. Duis volutpat mi at varius aliquam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla facilisi. Sed a neque nisl. Mauris at tincidunt est, vel fermentum ipsum. Etiam non dolor vitae ipsum vestibulum accumsan.

Vivamus quis semper libero. Aenean et est in nisl vulputate vehicula. Maecenas pellentesque egestas velit, et posuere justo volutpat eget. Aenean id nisl eget turpis ultrices faucibus. In in arcu non elit fermentum eleifend nec sed eros. Nulla facilisi.

## Troubleshooting

If a hash link does not land where expected:
1. Confirm target heading id exists.
2. Confirm URL hash matches heading slug.
3. Retry by clicking from `sample-test-markdown.md` again.

## Final Notes

This file is long enough for meaningful navigation tests in nested folders.

Return links:
- [Back to Step 2](#step-2)
- [Back to top](#install-guide)
