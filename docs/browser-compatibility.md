# Browser compatibility

Markdown Plus supports desktop **Google Chrome 116 or newer**. `manifest.json` owns `minimum_chrome_version`; `vite.config.mjs` derives both `build.target` and `build.cssTarget` from it. Settings → About reads the packaged manifest, so the displayed requirement follows the same value. Chrome 109–115 are outside the supported range. Use a current Chrome release for normal browsing.

This is a deliberately selected and tested support baseline, not a claim that every individual feature requires 116. The former Chrome 109 declaration covered Offscreen API availability alone. Vite 8's default Chrome 111 target and the presence of `color-mix()` did not establish compatibility for the complete extension.

## Audit boundaries

| Runtime area | Compatibility decision |
| --- | --- |
| Extension APIs | MV3 service worker, storage, messaging, tabs, downloads and file-access status retain the existing permissions. Offscreen discovery now uses `runtime.getContexts()` with the exact bundled document URL; this API requires Chrome 116. `offscreen.hasDocument()` only arrived in Chrome 150 and is no longer used. Concurrent creation remains serialized. |
| JavaScript output | Explicit `chrome116` target replaces Vite's moving default for every production chunk, including lazy dependencies. This transforms supported syntax; it does not polyfill browser APIs or dynamically constructed regexes. Reviewed source and emitted dependencies for newer collection/Promise helpers; no unguarded requirement above the selected baseline was identified. |
| Viewer Shiki | The reader uses `createOnigurumaEngine(import('shiki/wasm'))`, not the JavaScript regex engine. The actual WASM-backed highlighted output is checked in the file Viewer, where the extension's existing content-script execution policy permits it. No extension-page WASM CSP permission was added. |
| Theme Studio Shiki | The preview uses `createJavaScriptRegexEngine()` with automatic feature detection. Chrome 116 supports RegExp `v` (Chrome 112+) and selects the compatible target; regex flag groups from newer engines are not forced. Real colored preview tokens are checked in the packaged Settings page. Node's Shiki engine requirement is not treated as a browser requirement. |
| Mermaid, KaTeX, DOMPurify, React and CodeMirror | Checked the installed dependency/runtime paths and exercised the production lazy chunks: official and Beautiful Mermaid flowcharts, sanitized Markdown/Math, React surfaces, CodeMirror editing and live preview. This does not certify every upstream Mermaid diagram type or every syntax grammar. |
| Required CSS | `color-mix()` requires Chrome 111; `:has()` and size container queries are supported before 116. Runtime theme tokens, rendered surfaces and lazy syntax previews are checked at 116. Viewer SCSS imported with `?inline` is embedded in JavaScript, so a CSS target alone is not evidence of support. |
| Progressive CSS | `text-wrap: pretty` (117+) may fall back to ordinary wrapping. Standard `scrollbar-width`/`scrollbar-color` (121+) have existing WebKit scrollbar rules and the Viewer scrollbar implementation. These differences do not block reading or editing and do not raise the minimum. |
| File access | Offscreen creation/reuse and local file reads run against real Chrome APIs. The editor smoke substitutes only the native picker/file-handle boundary with a temporary in-memory fixture; native picker permissions and actual disk writes remain manual QA. Workspace picker fallback remains unchanged. |

The installed package versions are recorded in `package-lock.json`. Changing dependencies, browser APIs, required CSS or build configuration requires rerunning the relevant audit and browser checks; successful transpilation alone is insufficient.

## Manual production QA

Use the pinned Node version and prepare a production build:

```bash
nvm use
npm test
npm run build
```

Repeat these checks on both Chrome 116 and the current Stable release, using official Chrome-for-Testing binaries and a separate unsigned-in profile for each version:

1. Load `dist/` through **Load unpacked**. Open Popup and Settings, verify the file-access status before and after enabling **Allow access to file URLs**, and confirm About shows the packaged Chrome minimum.
2. Open Theme Studio, create a draft, and verify that its syntax preview has colored tokens. Check theme colors and backgrounds, then discard the draft or save it only in the test profile.
3. Open a disposable Markdown fixture with Unicode text, fenced JavaScript, Math and a Mermaid flowchart. Verify Markdown layout, Shiki colors, Math and Outline. Switch between official and Beautiful Mermaid and confirm diagrams render after reload.
4. Exercise repeated local-file navigation/reads and confirm that the offscreen document is reused without duplicate-document errors.
5. Enable the editor, connect that exact disposable file through the native picker, type and verify live preview, save, and reload to confirm the disk content. Check dirty-draft and external-change protection using only test files.
6. Inspect extension/page errors and record the exact browser versions, artifact version, results and any limitations in the release checklist. Test the final packaged release candidate again before submission.

The 2026-10-30 audit used a temporary automation harness, which was removed after verification; its dated results remain in the release checklist. That smoke substituted the editor's native picker/file-handle boundary and did not write through the editor. Native picker/save checks, workspace permissions, all export paths, cross-profile Sync and the final release ZIP remain separate release QA. Screenshots are diagnostic evidence, not a complete visual/accessibility review.

## Sources

- [Chrome Offscreen API and Chrome 116 context discovery](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Chrome runtime.getContexts reference](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-getContexts)
- [Vite 8 build target and CSS target](https://v8.vite.dev/config/build-options)
- [Chrome color-mix support](https://developer.chrome.com/docs/css-ui/css-color-mix)
- [Shiki regex engines and automatic runtime target](https://shiki.style/guide/regex-engines)
- [V8 RegExp v support](https://v8.dev/features/regexp-v-flag)
- [Chrome 117 text-wrap: pretty](https://developer.chrome.com/blog/chrome-117-beta)
- [Chrome scrollbar styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling)
- [Official Chrome-for-Testing downloads and version metadata](https://github.com/GoogleChromeLabs/chrome-for-testing)
