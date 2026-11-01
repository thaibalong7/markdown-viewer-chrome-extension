# Selected promotional artwork sources

The first Editorial Frost pair is approved. Its upload PNGs live in [`../`](../) with the five approved screenshots and Store icon. This folder keeps editable sources and local alternatives.

## Editable approved composition

- `artwork.html`: the selected layout, referencing the approved icon and Store screenshots directly from `assets/`.
- `render.mjs`: isolated Chrome/Playwright export to `assets/chrome-web-store/small-promo-tile.png` and `marquee.png` at 440 × 280 and 1400 × 560.

Open `artwork.html` for a local preview. With Playwright available, run `node assets/chrome-web-store/promotional/render.mjs`. Alternatively, set `MDP_ARTWORK_PLAYWRIGHT` to an installed Playwright `index.mjs` path. No application dependency is added.

The selected headline is **Your Markdown. A clearer view.** The small tile prioritizes the icon, brand, and reading benefit; the marquee adds the light Viewer and Aurora Studio. Keep exploratory changes in local alternatives; regenerate the selected outputs only when the revised artwork is approved.

## Retained local alternatives

`explorations/` is ignored by Git and preserves all five unselected directions: Midnight Studio, Paper & Ink, Electric Blue, Blueprint, and Spectrum. It includes editable `options.html`, `render-options.mjs`, ten candidate PNGs under `options/`, `gallery.html`, the comparison sheet, and the ZIP bundle. Nothing in this folder is selected for release.

Open `explorations/gallery.html` to compare the retained options. To regenerate them, run `node assets/chrome-web-store/promotional/explorations/render-options.mjs` with Playwright available or `MDP_ARTWORK_PLAYWRIGHT` pointing to an installed module. Source references follow the approved assets' current paths.
