# My Notes

This file exists to test relative links whose pathname contains a space.

## Purpose

Use this file to validate:
- filename with space (`My Notes.md`)
- encoded href (`My%20Notes.md`)
- hash navigation to a lower heading in the same file

## Navigation Checks

When opening from `sample-test-markdown.md`:
1. `File with space in name` should open this file in-viewer.
2. `Encoded href to file with space` should open this file and jump to `Encoded Heading`.
3. No new browser tab should be created for these internal markdown links.

## Content Block A

This paragraph is intentionally long so hash jumping has visible scroll movement. If the navigation works, landing at `Encoded Heading` should place the viewport around that section rather than at the top.

Donec placerat, lectus vel egestas ultrices, turpis nisi vehicula est, sit amet mattis nisi massa eu velit. Integer feugiat dignissim nibh, sed venenatis sem posuere vitae. Nunc facilisis euismod sem, at pharetra est luctus at. Aliquam erat volutpat. Integer tincidunt mi quis quam malesuada, at volutpat nibh convallis.

## Content Block B

Extra filler content:

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras venenatis sapien non libero interdum, id efficitur urna iaculis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In eu feugiat eros. Proin dapibus vulputate nibh non convallis. Suspendisse potenti.

Vivamus aliquet auctor lacinia. Sed posuere tincidunt arcu, in ultricies ligula ultrices non. Integer vitae orci vitae mi laoreet egestas. Suspendisse in porta nunc. Mauris eu iaculis lectus, et ullamcorper nibh.

## Encoded Heading

This section is the target for `./My%20Notes.md#encoded-heading`.

If you arrive here directly from the encoded link, hash resolution and scroll targeting are correct.

## Bottom Section

Useful self-navigation links:
- [Back to Purpose](#purpose)
- [Back to top](#my-notes)
