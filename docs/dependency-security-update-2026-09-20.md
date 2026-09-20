# Dependency security update — 2026-09-20

This changelog records the dependency-only security update completed for
Chrome Web Store release checklist item P0-1 on branch
`chore/p0-1-dependency-security`.

## Direct dependency updates

| Package | Previous | Updated |
| --- | --- | --- |
| `dompurify` | `3.4.3` | `3.4.15` |
| `markdown-it` | `14.1.1` | `14.3.2` |
| `mermaid` | `11.13.0` | `11.17.2` |

`package.json` and `package-lock.json` were updated together. The direct
dependency ranges now use the updated versions as their minimum compatible
versions.

## Relevant transitive changes

- `linkify-it` updated from `5.0.0` to `5.0.2` through `markdown-it`.
- `lodash-es` updated from `4.17.23` to `4.18.1` through `dagre-d3-es`.
- `uuid` updated from `11.1.0` to `14.0.2` through `mermaid`.
- `mermaid@11.17.2` replaced its previous Langium parser chain. As a result,
  `chevrotain@12` is no longer installed and its Node 22 engine warning no
  longer occurs on Node 20.

## Verification

All commands below ran with Node `20.19.5` and npm `10.8.2`:

- `npm ci`: passed without an engine warning.
- `npm test`: 87 test files and 485 tests passed.
- `npm run build`: passed; 562 modules transformed.
- `npm run size:report`: `dist` is 11 MB and bundled JavaScript is 10 MB as
  reported by `du`.
- `npm audit --omit=dev`: found 0 vulnerabilities.

The clean install's default full-tree audit still reports advisories in
development-only dependencies. They do not appear in the production audit or
the packaged extension runtime and are outside the P0-1 production blocker.
