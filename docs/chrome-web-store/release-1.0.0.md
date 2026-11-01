# Markdown Plus 1.0.0 — release record

## Published item

- Store: [Markdown Plus](https://chromewebstore.google.com/detail/markdown-plus/afbdmkpldpbkmmhejjlajocpneaiipmk).
- Extension ID: `afbdmkpldpbkmmhejjlajocpneaiipmk`.
- Public version selected for this release: **1.0.0**; source package and manifest also use `1.0.0`.
- Public listing checked on **2026-11-01**: **Updated November 1, 2026**, display version `1.0.0-20261030T075747621Z`, offered by **Ba Long**. Exact approval/publication timestamps are not exposed.
- Release notes: [CHANGELOG.md](../../CHANGELOG.md), also maintained in the [localized website release pages](../../site/releases/index.html).

## Selected listing inputs

| Form field | Retained release input |
| --- | --- |
| Name | Markdown Plus |
| Default listing language | English |
| Category | Tools under Productivity, confirmed on the public listing. |
| Short description | `Auto-detect and render Markdown files in a readable viewer UI.` — English native manifest metadata. |
| Detailed description / reviewer instructions | [Store listing copy](./store-listing.md); no account/password required. |
| Homepage | https://thaibalong7.github.io/markdown-viewer-chrome-extension/ |
| Support | https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues |
| Privacy policy | https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/ |
| Public data categories | Web history; Website content — confirmed on the public listing. |
| Single purpose / permissions / remote code | [Privacy form reference](./privacy-disclosure.md). |
| Global screenshots | Five images in [catalog order](../../assets/chrome-web-store/README.md); the same set was selected for all listing languages. |
| Store icon / promo | 128 px icon and selected Editorial Frost small tile/marquee in the same catalog. |

The public listing was read directly in a browser on 2026-11-01. It confirms the name, short/detailed description, Tools category, five screenshot slides, display version, update date, publisher, support URL, privacy URL, and disclosed data categories above. The public privacy summary also declares no sale outside approved use cases, no unrelated use/transfer, and no creditworthiness/lending use.

The remaining fields preserve selected inputs from preparation. A final dashboard export, exact reviewer text, country selection, and uploaded ZIP hash were not captured. The Store display version matches the candidate below, but that alone does not verify identical binary contents or complete manual QA. The small tile/marquee remain selected release resources; their current public placement was not independently checked.

## Local candidate evidence — 2026-10-30

The following evidence belongs to the prepared local candidate, **not an independently verified identity of the Store-delivered package**. No new extension build was created during the documentation reorganization. Local artifacts live in git-ignored `releases/` and may be unavailable in a fresh clone.

Artifact tạo lúc **2026-10-30 07:57:47.621 UTC**, tức **14:57:47.621 giờ Việt Nam**:

- [ZIP để upload](../../releases/markdown-plus-v1.0.0-20261030T075747621Z/markdown-plus-v1.0.0-20261030T075747621Z.zip).
- [Thư mục giải nén mới từ chính ZIP để Load unpacked / QA](../../releases/markdown-plus-v1.0.0-20261030T075747621Z/qa-unpacked/).
- [Metadata release.json](../../releases/markdown-plus-v1.0.0-20261030T075747621Z/release.json).
- Numeric version: `1.0.0`; packaged display version: `1.0.0-20261030T075747621Z`.
- SHA-256 ZIP: `47ce1a7f8b890006632ab644d022d9e68157170be580b66973d5d63210fa6a07`.
- HEAD nền: `d293bd66472b8dedac47ef80b2b9fe59306f9b6f`; worktree dirty. Có `source-runtime.patch` cạnh ZIP để lưu diff runtime/version so với HEAD, bao gồm thay đổi i18n có sẵn của người dùng.

| Kiểm tra | Kết quả |
| --- | --- |
| Node / clean install | Node `20.19.5`, npm `10.8.2`; `npm ci --no-audit --no-fund` pass, 368 packages. Còn deprecated `whatwg-encoding` ở test dependency; không EBADENGINE. |
| Full tests qua release script | **197 files / 1.463 tests pass**; không dùng `--skip-tests`. |
| Production build qua release script | Pass; còn cảnh báo CRXJS Rollup/Rolldown và chunk >500 kB như baseline. Development `dist/` được giữ nguyên. |
| Production audit | 3 low, 0 moderate/high/critical; cùng advisory KaTeX `GHSA-238p-pmpm-9mq7` qua `katex`, `@mdit/plugin-katex`, `mermaid`. Audit exit 1; quyết định chấp nhận có điều kiện tại thời điểm chuẩn bị (xem phân tích bên dưới), không phải zero-vulnerability pass. |
| Archive | Release script và kiểm tra độc lập pass integrity/CRC và SHA-256; manifest ở root; không source-only paths, `stats.html`, `.DS_Store`, `__MACOSX`; đủ icons 16/32/48/128. |
| Packaged manifest | MV3, version `1.0.0`, minimum Chrome `116`, permissions `storage`/`offscreen`/`downloads`, host `file:///*`. |
| Manual browser QA | **Chưa thực hiện/chưa được người dùng xác nhận cho candidate này**. Không dùng browser checks của build cũ thay cho ZIP mới. |

`build.log`, `production-audit.json`, ZIP checksum và `source-runtime.patch` được lưu cạnh `release.json` trong folder release local (git-ignored). Thay đổi runtime sau khi tạo candidate cần build và QA lại; không sửa nội dung thư mục QA rồi coi đó là cùng ZIP.

## Dependency decision retained from preparation

The candidate audit's three low entries came from the same KaTeX advisory [GHSA-238p-pmpm-9mq7](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7) through `katex@0.16.47`, `@mdit/plugin-katex@0.25.2`, and `mermaid@11.17.2`. The advisory requires pre-existing prototype pollution influencing renderer options; preparation did not demonstrate an exploit in the extension. HTML/Math and Mermaid SVG have separate sanitization boundaries. At the time, the fixed KaTeX version was outside both parents’ supported ranges, so preparation conditionally retained the compatible renderer versions rather than forcing an override or downgrading Mermaid. This is historical evidence, not a fresh security assessment. Reassess upstream compatibility and any reachable pollution path before the next package; tests alone do not establish safety.

## Continuing verification

Unrecorded candidate/browser QA and cross-profile Sync checks remain in the [post-launch backlog](../../planning/chrome-web-store/README.md). Shipped storage and compatibility behavior is documented in the [architecture overview](../architecture-overview.md), [theme system](../theme-system.md), and [browser compatibility reference](../browser-compatibility.md). Policy EN/VI/中文 deployment was compared byte-for-byte with local sources on 2026-10-30; navigation changes made later do not reuse those old whole-page hashes as proof of the current deployment.
