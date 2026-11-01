# Chrome Web Store — remaining work

Markdown Plus 1.0.0 is published. Release inputs and evidence now live in [docs/chrome-web-store/](../../docs/chrome-web-store/README.md); approved images, editable artwork, and demo fixtures live in [assets/chrome-web-store/](../../assets/chrome-web-store/README.md). This folder contains only unfinished verification and improvements for future releases.

## Verification and release operations

- [ ] Complete and record the [browser QA matrix](./manual-qa.md), including native file picker/Save, Windows paths, clean-profile onboarding, exports online/offline, and two-profile Chrome Sync.
- [ ] Record exact uploaded ZIP/SHA-256 and final saved dashboard values if recoverable; the local 1.0.0 candidate is not independently matched to the Store binary.
- [ ] Review native manifest descriptions and consider localized Store detailed descriptions. Runtime UI locales do not establish that localized listing copy exists.
- [ ] Add extension CI using pinned Node, `npm ci`, `npm test`, and `npm run build`; the existing workflow deploys only the website.
- [ ] Re-run production dependency audit before the next package; reassess KaTeX advisory [GHSA-238p-pmpm-9mq7](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7). The 2026-10-30 candidate audit reported 3 low entries through KaTeX/plugin/Mermaid, accepted conditionally at preparation time; that is not a current audit result. Evaluate compatible upstream fixes and any reachable prototype-pollution path before reusing that decision.

## Product improvements

- [ ] Make Math exports self-contained with CSS/fonts; retain the offline limitation until implemented and verified.
- [ ] Profile cold start, Markdown at 1 MB/5 MB, many fenced blocks, and large chunks before bundle optimization; use results to decide warnings/limits for very large Markdown.
- [ ] Measure workspace scanning before changing bounded concurrency, progress throttling, and allocations.
- [ ] Reduce settings broadcasts to unrelated tabs and add an export in-flight guard if QA/profiling demonstrates a need.
- [ ] Consider workspace filename/content search, additional themes, and Markdown extensions alongside the [product roadmap](../product-feature-roadmap/README.md).
- [ ] Consider remote raw Markdown URLs only with a separate permissions/privacy and design review.

Completed sanitizer, Sync-storage, browser-baseline, packaging, policy, and first-submission plans were removed after retaining their durable references. Git history contains the original preparation detail. Publication does not replace the unrecorded checks above.
