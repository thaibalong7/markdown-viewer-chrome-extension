# Approved resources

`assets/` contains selected brand artwork and approved publishing resources. Keep reusable selected compositions, rendering tools, and demo fixtures beside their approved assets. Unselected concepts/experiments remain in `planning/`; raw captures and generated working files may be retained locally through `.gitignore`.

- [`brand/markdown-plus-icon.svg`](./brand/markdown-plus-icon.svg): approved vector master of the Markdown Plus icon.
- [`readme/`](./readme/): user-guide illustrations with red numbered callouts and the Chrome compatibility badge; see the [visual asset catalog](./readme/README.md).
- [`chrome-web-store/`](./chrome-web-store/): the complete approved Store upload set, including five screenshots, the small promo tile, marquee, and 128 px Store icon, editable promotional compositions, and screenshot demo fixtures.

The extension's packaged PNG icon variants remain in `public/icons/`, because Vite copies `public/` into `dist/`. Resources under `assets/` are not automatically packaged. The Store icon is a byte-identical copy of `public/icons/icon-128.png` included in the upload set for convenience; keep that copy aligned when the approved icon changes.
