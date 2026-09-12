# Multi-format Viewer Phase 0 Baseline

Captured: 2026-09-12

Source revision: `0a8517d`

Runtime: Node `v20.19.5`, npm `10.8.2`

## Automated verification

```text
$ npm test
Test Files  44 passed (44)
Tests       215 passed (215)
```

```text
$ npm run build
491 modules transformed
built in 949ms
```

The build emitted the existing CRX `rollupOptions`/`rolldownOptions` warnings and the existing warning for chunks larger than 500 kB.

## Bundle-size baseline

```text
$ npm run size:report
10M  dist
9.2M total JavaScript under dist/assets
```

Largest emitted JavaScript chunks reported by the production build:

```text
1,525.52 kB  dist--d47hTEU.js
  637.55 kB  cpp-BTzTL8CV.js
  622.32 kB  wasm-7wjZdm5c.js
  479.29 kB  chunk-GAX3EE6F-YOC7jncq.js
  462.06 kB  viewer-loader-BHAUCb2P.js
```

Chunk hashes are build outputs and may change even when a comparable logical chunk remains present. Use the aggregate `dist` and JavaScript totals for phase-to-phase comparison.

## Manual Chrome smoke checklist

Use the fixtures under `test/fixtures/multi-format-viewer/` after loading the unpacked extension from `dist/`:

- open `navigation/index.md` directly and verify the viewer mounts;
- open `Guide Notes.markdown` through its link and verify Unicode, spaces, the TOC, and editor mode;
- enable the Mermaid plugin and verify the Mermaid fence renders;
- refresh the guide and use Back/Forward to verify navigation state;
- open the workspace fixture folder and navigate to `Dự án/docs/Hướng dẫn.mdown`;
- open `empty.md` directly and verify the current empty-file behavior (the viewer does not mount).

These Chrome-only checks are intentionally recorded separately from the automated result because they require an interactive extension session with file-URL access enabled.
