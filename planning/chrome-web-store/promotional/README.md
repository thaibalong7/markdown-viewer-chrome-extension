# Promotional artwork planning

The first Editorial Frost pair is approved. Its upload PNGs live in [`../../../assets/chrome-web-store/`](../../../assets/chrome-web-store/) with the five approved screenshots and Store icon. This folder keeps editable sources and local alternatives.

## Editable approved composition

- `artwork.html`: the selected layout, referencing the approved icon and Store screenshots directly from `assets/`.
- `render.mjs`: isolated Chrome/Playwright export to `assets/chrome-web-store/small-promo-tile.png` and `marquee.png` at 440 × 280 and 1400 × 560.

Open `artwork.html` for a local preview. With Playwright available, run `node planning/chrome-web-store/promotional/render.mjs`. Alternatively, set `MDP_ARTWORK_PLAYWRIGHT` to an installed Playwright `index.mjs` path. No application dependency is added.

The selected headline is **Your Markdown. A clearer view.** The small tile prioritizes the icon, brand, and reading benefit; the marquee adds the light Viewer and Aurora Studio. Keep future edits here until approved, then export selected resources into `assets/`.

## Retained local alternatives

`explorations/` is ignored by Git and preserves all five unselected directions: Midnight Studio, Paper & Ink, Electric Blue, Blueprint, and Spectrum. It includes editable `options.html`, `render-options.mjs`, ten candidate PNGs under `options/`, `gallery.html`, the comparison sheet, and the ZIP bundle. Nothing in this folder is selected for release.

Open `explorations/gallery.html` to compare the retained options. To regenerate them, run `node planning/chrome-web-store/promotional/explorations/render-options.mjs` with Playwright available or `MDP_ARTWORK_PLAYWRIGHT` pointing to an installed module. Source references follow the approved assets' current paths.
