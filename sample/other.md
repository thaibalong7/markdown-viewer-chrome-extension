# Other Doc

This is the primary sibling target for Phase 1 internal hyperlink navigation tests.

## Intro

If the feature works, clicking a link from `sample-test-markdown.md` should open this file inside Markdown Plus without a full reload.

## Context

This document is intentionally longer so you can test:
- scroll movement after internal navigation
- hash targeting in a sibling file
- reading position changes when moving back and forth

When testing, try scrolling to the bottom first, then click a hash link to verify the viewer jumps to the expected heading.

## Navigation Checklist

1. Open this file from `sample-test-markdown.md` using `Sibling file`.
2. Confirm the shell stays mounted (sidebar, toolbar, theme remain stable).
3. Go back and open `Sibling file with hash`.
4. Confirm it jumps to `Intro`.
5. Use browser back/forward and verify viewer state remains coherent.

## Long Content Block A

Markdown Plus should render this file without reloading the full page. This paragraph is verbose on purpose to create enough vertical space for meaningful scroll tests. You can quickly verify that internal navigation is working by jumping between heading anchors and watching whether the shell UI persists across transitions.

Internal links inside this file:
- [Jump to Deep Link Target](#deep-link-target)
- [Jump to Notes](#notes)
- [Jump to Bottom Checks](#bottom-checks)

## Long Content Block B

Use this block to test continuous scrolling behavior. Keep scrolling and observe whether heading highlighting and hash updates remain accurate after navigation from another file. If your implementation is correct, the document should remain responsive and the navigation should not open a new browser tab for internal markdown paths.

## Deep Link Target

Use this section if you want to add another hash-navigation case later.

To stress hash scroll a bit more, this section is not near the top. If a link points here, the viewer should land around this heading instead of staying at top.

## Notes

Additional filler text for realistic document length:

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non justo at mauris varius volutpat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer at justo id turpis vulputate tempor. Vivamus volutpat aliquam dui, vitae accumsan lectus interdum et. Donec euismod velit eget est consectetur, non cursus magna faucibus. Nunc sed neque vitae risus tempus tristique.

Praesent aliquam, mauris et feugiat malesuada, nisl tortor aliquet metus, ac aliquam tortor neque vel nibh. Ut nec blandit nibh. Suspendisse id semper nisi. Donec sollicitudin feugiat tellus, sit amet bibendum neque sagittis non. Quisque gravida lacinia consectetur. Morbi congue porta neque, non viverra lectus volutpat nec.

## Bottom Checks

If you are here after clicking a link, hash scrolling worked for a lower section.

Useful return links:
- [Back to Intro](#intro)
- [Back to top](#other-doc)
