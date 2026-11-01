# Chrome Web Store — approved upload assets

This folder is the single destination for approved Chrome Web Store images. These eight PNGs form the selected 1.0.0 release upload set; see the [release record](../../docs/chrome-web-store/release-1.0.0.md). The five screenshot compositions and the first Editorial Frost promotional pair are selected; the promotional pair was approved on October 14, 2026.

| File | Dimensions | Store field / purpose |
| --- | --- | --- |
| `icon-128.png` | 128 × 128 | Store icon; matches the packaged extension icon. |
| `01-open-local-markdown.png` | 1280 × 800 | Screenshot 1: local Markdown workspace and focus mode. |
| `02-themes-for-focus.png` | 1280 × 800 | Screenshot 2: Light, Dark, and Aurora Studio. |
| `03-rich-markdown.png` | 1280 × 800 | Screenshot 3: rich Markdown and plugin controls. |
| `04-preview-zoom-export.png` | 1280 × 800 | Screenshot 4: diagram zoom/export and image lightbox. |
| `05-make-it-yours.png` | 1280 × 800 | Screenshot 5: Theme Studio and reader/file-access controls. |
| `small-promo-tile.png` | 440 × 280 | Small promotional image. |
| `marquee.png` | 1400 × 560 | Optional marquee promotional image. |

Screenshot 05's file-access crop was corrected on October 30, 2026 to show the actual **File URL access** row, setup instructions, and **Allowed** status. It shows the configured state; new installations must still enable **Allow access to file URLs** as explained in the [Store listing copy](../../docs/chrome-web-store/store-listing.md). The retained Editorial Frost renderer uses the General Settings raw capture with SVG viewBox `930 1130 1800 612`; the old crop showed the activation switch instead of the permission row. Unrecorded candidate comparisons remain in [post-launch QA](../../planning/chrome-web-store/manual-qa.md).

The five screenshots were re-exported on October 30, 2026 as **24-bit RGB PNG without alpha**, matching the dashboard's screenshot upload requirement. All remain 1280 × 800. Their former alpha channels were entirely opaque; decoded RGB pixels are identical before and after conversion. Re-exporting from the composition renderer must preserve this RGB/no-alpha format before Store upload. The Store icon retains its existing transparency and continues to match the packaged icon.

## Visual direction

Editorial Frost uses cool white and pale blue surfaces, navy sans-serif typography, blue accent rules, a faint structural grid, rounded screenshot frames, and the original approved icon. The promotional headline is **Your Markdown. A clearer view.** Interface images are crops from the approved screenshots rather than synthesized UI. Paths in the Store screenshots use clean demo locations.

## Sources and working files

The approved icon master lives at [`../brand/markdown-plus-icon.svg`](../brand/markdown-plus-icon.svg). Packaged icon variants live under [`../../public/icons/`](../../public/icons/).

Editable promotional compositions and export instructions live under [`./promotional/`](./promotional/). Screenshot demo data and capture notes live under [`./screenshots/`](./screenshots/). Unselected icon concepts and promotional variants remain local and ignored.
