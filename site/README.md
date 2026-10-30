# Markdown Plus public website

Developer maintenance guide. Users should follow the [README](../README.md#quick-start) for Chrome Web Store availability, installation, and extension controls. See [DEV.md](../DEV.md) for development setup and the [technical documentation index](../docs/README.md) for other references.

`site/` is the buildless GitHub Pages output. English Home lives at `/`; the existing policy URL remains `/privacy/`. Vietnamese lives at `/vi/` and `/vi/privacy/`; Simplified Chinese lives at `/zh-CN/` and `/zh-CN/privacy/`. All editions share `assets/styles.css`, `assets/site.js`, and the approved brand SVG copied from `assets/brand/markdown-plus-icon.svg`. Website changes do not modify the extension’s UI, processing, or permissions.

## Languages and editing

The website supports the same locales as the extension: English, Tiếng Việt, and 简体中文（中国）. Its native disclosure in the header links to the equivalent page in each language; internal Home, Features, and Privacy links retain the chosen locale. With JavaScript, switching languages also retains the current section fragment. The URL selects the language, with English at the original URLs; there is no automatic redirect or stored language preference. Every edition has translated titles, descriptions, accessible names, and alternate-language metadata, and all content and language links work without JavaScript.

Edit shared markup in `scripts/site/templates/` and copy in `scripts/site/locales/{en,vi,zh-CN}.json`, then run `python3 -B scripts/localize-site.py`. Commit the regenerated six HTML files with those sources. Message keys describe their purpose; complete sentences can change word order. Catalogs contain plain text and named placeholders. The generator escapes translations and inserts only the fixed inline markup/code/link slots in `scripts/site/slots.json`; translations cannot supply HTML or URLs. Missing keys, changed placeholders, and unbalanced markup fail validation. Tests compare the locale list with the extension registry and check that generated HTML is current.

Marketing wording is adapted to each audience; the policy preserves the same disclosures and effective date. See the website notes under each locale in the [localization writing guide](../docs/localization.md). Illustrative document bodies, source code, filenames, and paths remain literal English examples, identified with `lang="en"` where appropriate. Interface labels around those samples are translated. The header language control is a website-only composition of the existing surface colors, borders, focus ring, and native disclosure behavior; it does not change extension controls. It supports keyboard use, Escape and outside-click dismissal with JavaScript, and touch-sized language links.

## Landing-page direction

Home follows a product-demo-and-features structure: a centered display headline and availability CTA, a large illustrative workspace, supported formats, four feature illustrations, the local-processing story, installation steps, a closing CTA, and a complete footer. Different section compositions give the page a visual rhythm. Descriptions communicate real capabilities; the experimental editor is labeled, and user installation follows Chrome Web Store. No ratings, customer counts, or testimonials are invented.

The design takes its identity from the extension’s [design-system foundations](../docs/design-system/README.md): blue navigation, blue-gray surfaces, system typography, green positive states, and familiar product artwork. Application outlines are static snapshots of `src/shared/icons/application-icons.js` (24px, 1.8 stroke). File identities come from `src/shared/icons/file-type-icons.js` (16px, 1.25 stroke). Update affected snapshots if those canonical definitions change.

Display typography, the floating header, blue ambient lighting, larger radii, bento compositions, and the navy closing CTA are explicit presentation choices local to `site/`. They adapt the extension’s visual identity for a public landing page and do not establish new Viewer, Popup, or Settings contracts. The marketing palette derives from the application palette and uses its own semantic variables for readable website surfaces in both themes.

## Installation links and Store availability

The Chrome Web Store listing is pending review. Header and primary CTA labels describe availability, and the hero announcement and closing note disclose that review is in progress. All installation links currently lead to the root [README Quick start](../README.md#quick-start), which is the canonical place for the pending status and eventual official Store link. Do not substitute a source build, Developer mode, or an unpacked download as the public installation route; those instructions belong in [DEV.md](../DEV.md).

When the listing is approved:

1. Verify the official listing URL and add it to the README Quick start. Replace the pending note and conditional installation wording there.
2. Update availability labels, the hero announcement, installation descriptions, and closing note in all three `scripts/site/locales/` catalogs. Keep file-URL permission instructions after Store installation.
3. Point installation CTAs in both `scripts/site/templates/home.html` and `privacy.html` to the verified Store URL; keep installation-guide links pointing to the README Quick start.
4. Regenerate all six HTML pages and run the [website preflight](#preview-and-verification). Review the three languages together so no stale pending or source-install copy remains.

## Interaction and privacy

The sample workspace offers Reader and Source views of the same illustrative Markdown. Its file tree and document toolbar are decorative, not working filesystem controls. Miniature theme/editor illustrations are also labeled or hidden from assistive technology. The demo loads no documents and makes no network calls. Without JavaScript the Reader view stays visible and the sample-view buttons stay hidden.

Both pages share explicit light/dark controls. The website follows the system preference until a theme is chosen, then remembers only that choice under `mdp-site-theme` in local storage. Blocked storage falls back to a working selection for the current page. With JavaScript disabled, all website content, links, and the CSS system-theme fallback remain usable. Website theme preference is separate from extension settings and is disclosed in the policy.

The complete policy article is preserved, including prior disclosures about sync storage, local snapshots, IndexedDB, remote resources, exported-file CDN requests, permissions, and user controls. The privacy update dated October 30, 2026 clarifies theme-image deletion, Editor Save, and Limited Use; keep the date in the shared template, locale catalogs, and localization test aligned when the policy changes. Desktop has sticky section navigation; narrower layouts use a native details disclosure with focus transferred to the chosen section. Shared navigation and the site footer are consistent across both pages.

## Preview and verification

Serve with `python3 -m http.server 4173 --directory site`. Check Home and Privacy in both themes at 375, 768, 1024, and 1440px; verify sample Reader/Source selection, theme persistence across navigation/reload, system and blocked-storage fallbacks, mobile policy links, keyboard focus/skip links, reduced motion, contrast, and horizontal overflow. No build, remote fonts, analytics, or third-party scripts are needed. The existing Pages workflow publishes this directory after a push to `master`; local editing does not publish it.

Run the same automated preflight used by deployment from the repository root:

```bash
python3 -B -m unittest discover -s scripts/__tests__ -p 'test_check_site.py'
python3 -B -m unittest discover -s scripts/__tests__ -p 'test_site_localization.py'
python3 -B scripts/localize-site.py --check
python3 -B scripts/check-site.py
node --check site/assets/site.js
```

The checker verifies required pages, local HTML links and assets, target fragments, duplicate IDs, and paths that would lose the GitHub Pages project prefix. Locale checks verify catalogs, static editions, safe rendering, and cross-language links. The site's JavaScript interaction tests run with `npm test -- scripts/__tests__/site-localization.test.mjs` after selecting the pinned Node version. These checks do not fetch external destinations or replace browser checks; inspect all three languages, especially Vietnamese wrapping and Chinese font coverage.

## Deploy to GitHub Pages

The existing [Pages workflow](../.github/workflows/deploy-pages.yml) validates the website, uploads `site/`, and publishes it as one website. The directory becomes the published root; public URLs do not include `/site/`.

| Page | Source | Published URL |
| --- | --- | --- |
| Home | `site/index.html` | [Home](https://thaibalong7.github.io/markdown-viewer-chrome-extension/) |
| Privacy | `site/privacy/index.html` | [Privacy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/) |

1. In the GitHub repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. This is a repository setting, not an HTML or workflow-file change; see the [GitHub guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
2. Commit and push the website changes to `master`. The workflow runs when `site/**`, its templates/catalogs, generator, workflow file, or website checker/tests change. It checks that localized output is current, then publishes the complete `site/` directory, including all six pages and shared assets.
3. Open **Actions → Deploy public site to GitHub Pages** and wait for the deploy job to succeed. The deployment URL is attached to the `github-pages` environment.
4. For a manual deployment, open the same workflow, select **Run workflow**, and choose `master`. A manual run publishes the files already on GitHub; it cannot publish uncommitted local edits.

The workflow has the required Pages/OIDC permissions and uses the repository’s `GITHUB_TOKEN`; no personal access token or npm install is needed. Extension tests/builds are separate from publishing this static website.

## Link pages correctly

Use relative URLs for navigation and assets so the GitHub Pages repository prefix is preserved. These links are already wired in the header and footer:

```html
<!-- From site/index.html -->
<a href="./privacy/">Privacy</a>

<!-- From site/privacy/index.html -->
<a href="../">Home</a>
<a href="../#features">Home features</a>
<link rel="stylesheet" href="../assets/styles.css">
```

Avoid root-relative links such as `/privacy/` or `/assets/styles.css`: those would resolve at `thaibalong7.github.io/` rather than inside `/markdown-viewer-chrome-extension/`. To add another page, create a directory such as `site/changelog/index.html`, link to `./changelog/` from Home and `../changelog/` from Privacy, then run the preflight checks. The same deployment includes it automatically.
