# Approved resources

`assets/` contains selected brand artwork and approved publishing resources. Keep concepts, captures, experiments, and rendering tools under `planning/`; generated working files may be retained locally through `.gitignore`.

- [`brand/markdown-plus-icon.svg`](./brand/markdown-plus-icon.svg): approved vector master of the Markdown Plus icon.
- [`chrome-web-store/`](./chrome-web-store/): the complete approved Store upload set, including five screenshots, the small promo tile, marquee, and 128 px Store icon.

The extension's packaged PNG icon variants remain in `public/icons/`, because Vite copies `public/` into `dist/`. Resources under `assets/` are not automatically packaged. The Store icon is a byte-identical copy of `public/icons/icon-128.png` included in the upload set for convenience; keep that copy aligned when the approved icon changes.
