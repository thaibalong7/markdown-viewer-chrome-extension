# Candidate Markdown Plus 1.0.0

Numeric version public được người dùng chốt ngày **2026-10-30**: **1.0.0**. Candidate đã đóng gói và pass automated checks; manual QA chờ người dùng, chưa submit/publish.

## Source và phạm vi đóng gói

- Đồng bộ `package.json`, hai vị trí root/package trong `package-lock.json` và `manifest.json` thành `1.0.0`; không đổi dependency hoặc permissions.
- Worktree có thay đổi sẵn trong `src/i18n/diagnostic-keys.js`, `src/i18n/locales/{en,vi,zh-CN}.json`, `planning/README.md` và `planning/design-system/`. Giữ nguyên các thay đổi của người dùng; runtime build dùng trạng thái worktree tại thời điểm tạo candidate, bao gồm thay đổi i18n.
- Không commit/push trong task này. Source commit trong `release.json` là HEAD nền; `dirty: true` nghĩa là commit đó chưa mô tả đầy đủ source được build. ZIP/SHA-256 xác định artifact cần QA.
- `npm run release -- --bump none` giữ numeric version `1.0.0` và thêm timestamp vào packaged `version_name`/tên ZIP theo [release workflow](../../docs/releasing.md). Timestamp giúp nhận diện candidate, không thay version bump cho update Store.

## Kiểm tra và artifact

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
| Production audit | 3 low, 0 moderate/high/critical; cùng advisory KaTeX `GHSA-238p-pmpm-9mq7` qua `katex`, `@mdit/plugin-katex`, `mermaid`. Audit exit 1; giữ quyết định chấp nhận có điều kiện và phân tích ở checklist mục 1, không phải zero-vulnerability pass. |
| Archive | Release script và kiểm tra độc lập pass integrity/CRC và SHA-256; manifest ở root; không source-only paths, `stats.html`, `.DS_Store`, `__MACOSX`; đủ icons 16/32/48/128. |
| Packaged manifest | MV3, version `1.0.0`, minimum Chrome `116`, permissions `storage`/`offscreen`/`downloads`, host `file:///*`. |
| Manual browser QA | **Chưa thực hiện/chưa được người dùng xác nhận cho candidate này**. Không dùng browser checks của build cũ thay cho ZIP mới. |

`build.log`, `production-audit.json`, ZIP checksum và `source-runtime.patch` được lưu cạnh `release.json` trong folder release local (git-ignored). Thay đổi runtime sau khi tạo candidate cần build và QA lại; không sửa nội dung thư mục QA rồi coi đó là cùng ZIP.

## Gate còn mở

- [ ] Người dùng xác nhận manual QA trên đúng ZIP/SHA-256, gồm file access onboarding và native file picker/Save.
- [ ] Sync thực tế giữa hai profile và các bước trong [manual release QA matrix](./release-checklist.md#manual-release-qa-matrix) được ghi nhận, gồm OS/Chrome versions.
- [ ] Dashboard/account, category selections, listing/screenshots, privacy/permissions và reviewer steps đã lưu theo [hướng dẫn](./submission-guide.md).
- [ ] Đã submit, có kết quả review và xác nhận publish.

Privacy policy public đã được xác minh riêng ở [hồ sơ mục 5](./privacy-permissions-verification.md#xác-minh-bổ-sung-sau-khi-người-dùng-publish-policy). Release notes ở [release-notes-1.0.0.md](./release-notes-1.0.0.md).
