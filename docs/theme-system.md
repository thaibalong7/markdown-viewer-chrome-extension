# Markdown Plus — Theme System

Tài liệu này là hướng dẫn kỹ thuật đầy đủ về hệ thống theme hiện tại của Markdown Plus, dành cho cả maintainer, contributor và AI coding agent. Nội dung mô tả trạng thái đang được triển khai trong source code, không phải roadmap. Nếu tài liệu và runtime code mâu thuẫn, ưu tiên `src/**`, sau đó cập nhật lại tài liệu trong cùng thay đổi.

Để hiểu theme trong toàn bộ kiến trúc extension, đọc tài liệu này cùng [Architecture Overview](./architecture-overview.md). Tài liệu hiện tại đi sâu vào theme; Architecture Overview giữ bức tranh ownership và runtime flow cấp hệ thống.

## 1. Mục tiêu và nguyên tắc sản phẩm

Theme trong Markdown Plus là một thực thể hình ảnh hoàn chỉnh, không chỉ là một tên palette. Mỗi theme sở hữu màu sắc giao diện, theme nền dùng cho code highlighting, và background scene riêng của chính nó.

Hệ thống phân biệt hai nhóm theme:

- Built-in theme được đóng gói cùng extension, định nghĩa bằng source code và chỉ đọc đối với người dùng.
- Custom theme do người dùng tạo, đặt tên, chỉnh màu, cấu hình background và lưu trong Settings.

Settings là nơi authoring theme. Popup chỉ làm nhiệm vụ chọn một theme đã tồn tại, bao gồm cả built-in theme và custom theme đã lưu. Popup không chứa input chỉnh màu, gradient hay ảnh nền.

Một số nguyên tắc bất biến:

- Background thuộc về từng theme, không phải một global appearance setting.
- `theme.activeId` chỉ ra theme đang hoạt động.
- Built-in theme và custom theme đi qua cùng một bước resolve trước khi Viewer sử dụng.
- Custom theme kế thừa các token không cho chỉnh trực tiếp từ một built-in `baseId`; Shiki theme mặc định đi theo base nhưng có thể được override bằng một bundled syntax theme đã allowlist.
- Dữ liệu settings có thể đồng bộ bằng `chrome.storage.sync`, nhưng binary image asset của custom theme chỉ được lưu trên thiết bị hiện tại trong IndexedDB.
- Settings không nhận arbitrary CSS, inline SVG hoặc remote image URL.

## 2. Bản đồ source code

| Trách nhiệm | Source chính |
| --- | --- |
| Palette built-in, registry, resolve theme, CSS variables | `src/theme/index.js` |
| Catalog syntax theme được phép chọn và mapping theo base | `src/theme/syntax-themes.js` |
| Kiểu background và chuyển descriptor thành scene render | `src/theme/backgrounds.js` |
| Client gọi background service để quản lý image asset | `src/theme/theme-asset-client.js` |
| Default settings và settings version | `src/settings/default-settings.js` |
| Validation và normalization | `src/settings/settings-schema.js` |
| Migration, merge, save, reset | `src/settings/settings-service.js` |
| Settings UI để quản lý custom theme | `src/options/sections/ThemeSettings.jsx` |
| Dedicated custom-theme editor | `src/options/sections/ThemeEditor.jsx`, `ThemeColorFields.jsx`, `ThemeBackgroundFields.jsx` |
| Live mini Viewer preview trong theme authoring | `src/options/sections/ThemePreview.jsx` |
| Workflow save theme và image asset | `src/options/hooks/useSettingsForm.js` |
| Popup theme selector | `src/popup/panels/ReaderPanel.jsx` |
| Background asset IndexedDB service | `src/background/theme-asset-service.js` |
| Message route cho settings và asset | `src/background/message-router.js` |
| Message type và caller wrapper | `src/messaging/index.js` |
| Validate/read/parse image | `src/shared/background-image.js` |
| Resolve và render background trong Viewer | `src/viewer/react/components/BackgroundScene.jsx` |
| Đặt background scene vào shell và bật glass surfaces | `src/viewer/react/components/ViewerShell.jsx` |
| CSS của scene, animation và print behavior | `src/viewer/styles/_background-scene.scss` |
| Surface transparency khi có visual background | `src/viewer/styles/layout.scss` |
| Áp CSS variables lên Viewer | `src/viewer/app/viewerStyles.js` |
| Quyết định style-only update hay full render | `src/shared/settings-diff.js` |
| Shiki mapping và bundled theme loaders | `src/viewer/core/shiki-config.js` |
| Mermaid theme variables | `src/viewer/mermaid/mermaid-render-service.js` |
| Live settings broadcast vào content script | `src/content/viewer-loader.js` |

Khi bắt đầu một thay đổi về theme, nên đọc theo thứ tự `src/theme/index.js` → `src/theme/backgrounds.js` → `src/settings/settings-schema.js` → surface UI hoặc renderer liên quan. Nếu thay đổi cấu trúc dữ liệu, phải đọc thêm `src/settings/settings-service.js` để quyết định có cần migration và tăng version hay không.

## 3. Mô hình settings được lưu

Theme settings hiện dùng schema version `2` và có shape tối thiểu:

```js
{
  theme: {
    activeId: 'light',
    customThemes: []
  },
  version: 2
}
```

`DEFAULT_SETTINGS` nằm trong `src/settings/default-settings.js`. Toàn bộ settings được lưu dưới key `mdViewer.settings` bởi `src/settings/settings-service.js`.

`settingsService` ưu tiên `chrome.storage.sync` và dùng `chrome.storage.local` làm fallback khi sync storage không tồn tại. Đây là storage của descriptor và preferences; nó không phải storage của binary image asset.

### `theme.activeId`

`activeId` phải trỏ đến một trong hai loại id:

- Một key có thật trong `BUILT_IN_THEMES`, ví dụ `light`, `dark`, `aurora-glass`.
- Một `id` có thật trong `theme.customThemes`.

Nếu dữ liệu được load với policy `invalid: 'default'` và active id không tồn tại, hệ thống quay về `light`. Khi save bình thường, active id không tồn tại sẽ tạo `SettingsValidationError`.

### `theme.customThemes`

Mỗi custom theme có shape:

```js
{
  id: 'custom:midnight-1234',
  name: 'Midnight',
  baseId: 'dark',
  syntaxThemeId: null,
  colors: {
    background: '#101827',
    surface: '#172033',
    panelBg: '#111827',
    text: '#f8fafc',
    bodyText: '#e2e8f0',
    heading: '#ffffff',
    muted: '#94a3b8',
    border: '#334155',
    codeBg: '#0f172a',
    codeText: '#e2e8f0',
    link: '#67e8f9',
    accent: '#c4b5fd'
  },
  background: {
    type: 'gradient',
    startColor: '#101827',
    endColor: '#312e81',
    angle: 135,
    motion: 'system',
    overlayOpacity: 0.1
  }
}
```

Ý nghĩa từng field:

| Field | Ý nghĩa |
| --- | --- |
| `id` | Identity ổn định dùng để select, update và delete theme. Không dùng `name` làm identity. |
| `name` | Tên hiển thị do người dùng đặt, dài từ 1 đến 48 ký tự sau khi trim. |
| `baseId` | Built-in theme cung cấp các token không override và Shiki fallback khi không có syntax override. |
| `syntaxThemeId` | `null` để theo Shiki mapping của `baseId`, hoặc id của một trong 30 bundled syntax themes. |
| `colors` | Các semantic color override được phép chỉnh. Có thể sparse trong persisted data. |
| `background` | Structured descriptor của background scene thuộc theme này. |

Custom theme id phải match `^custom:[a-z0-9][a-z0-9-]{7,127}$`. `createCustomThemeDraft()` sinh id bằng `crypto.randomUUID()` khi có, hoặc fallback từ timestamp và random value. Draft mới đặt `syntaxThemeId: null` để tiếp tục theo base; dữ liệu theme cũ không có field này cũng được normalize về cùng hành vi.

Tối đa 32 custom theme được chấp nhận. Id phải duy nhất trong `customThemes`.

## 4. Mô hình built-in theme

Built-in theme được định nghĩa trong `src/theme/index.js` qua ba lớp:

1. Các palette constant như `LIGHT_THEME_COLORS`, `DARK_THEME_COLORS`, `AURORA_GLASS_THEME_COLORS`.
2. `BUILT_IN_THEMES`, map từ built-in id sang palette.
3. `BUILT_IN_THEME_DEFINITIONS`, registry đầy đủ gồm `id`, `name`, `colors`, và `background`.

Shape resolve của một built-in theme:

```js
{
  id: 'aurora-glass',
  name: 'Aurora Glass',
  source: 'built-in',
  baseId: 'aurora-glass',
  syntaxThemeId: 'night-owl',
  colors: { /* full semantic palette */ },
  background: {
    type: 'gradient',
    variant: 'aurora',
    motion: 'system',
    overlayOpacity: 0.08
  }
}
```

Built-in themes hiện có:

| Id | Label |
| --- | --- |
| `light` | Light |
| `high-contrast-light` | High Contrast Light |
| `dark` | Dark |
| `high-contrast-dark` | High Contrast Dark |
| `sakura` | Sakura |
| `matcha` | Matcha |
| `solarized-dark` | Solarized Dark |
| `vscode-dark` | Dark (VS Code) |
| `dracula` | Dracula |
| `gruvbox` | Gruvbox |
| `night-owl` | Night Owl |
| `min-dark` | Min (Dark) |
| `aurora-glass` | Aurora Glass |

Mỗi built-in theme đã có background descriptor của riêng nó. Hiện tại `aurora-glass` dùng preset gradient `aurora`; các built-in còn lại dùng `DEFAULT_THEME_BACKGROUND`, tức `type: 'none'`.

Về kiến trúc, built-in có thể dùng `none`, `solid` hoặc `gradient` giống custom theme chỉ bằng descriptor trong registry. Built-in image/animated image đóng gói cùng extension chưa được hỗ trợ đầy đủ ở thời điểm tài liệu này được viết; image renderer hiện chỉ biết tải `assetId` từ IndexedDB. Phần “Mở rộng background” bên dưới mô tả hướng đúng để bổ sung packaged asset.

Built-in theme không sửa trực tiếp trong Settings. Người dùng tạo custom theme dựa trên built-in, sau đó chỉnh bản custom. Điều này giữ built-in registry ổn định, giúp migration và fallback có hành vi dự đoán được.

## 5. Palette và semantic color tokens

Palette dùng semantic names thay vì đặt tên theo component cụ thể. Một palette built-in đầy đủ hiện có các nhóm token sau:

| Nhóm | Token |
| --- | --- |
| Chế độ màu | `colorScheme` |
| Nền và surface | `background`, `surface`, `panelBg`, `panelStrong` |
| Chữ | `text`, `bodyText`, `heading`, `muted` |
| Border | `border`, `borderStrong` |
| Code | `codeBg`, `codeText` |
| Link và accent | `link`, `linkSoft`, `accent`, `accentSoft` |
| Panel toggle | `panelToggleBg`, `panelToggleText`, `panelToggleBorder`, `panelToggleHoverBg`, `panelToggleHoverText`, `panelToggleShadow`, `panelToggleHoverShadow` |
| Warning và danger | `warning`, `warningSoft`, `danger` |
| Table | `tableBorder`, `tableHeaderBg`, `tableRowAltBg` |
| Toast info | `toastInfoBg`, `toastInfoText`, `toastInfoBorder` |
| Toast success | `toastSuccessBg`, `toastSuccessText`, `toastSuccessBorder` |
| Toast warning | `toastWarningBg`, `toastWarningText`, `toastWarningBorder` |
| Toast error | `toastErrorBg`, `toastErrorText`, `toastErrorBorder` |
| Scrollbar tùy chọn | `scrollbarThumb`, `scrollbarThumbHover` |

Settings UI chỉ expose các token nằm trong `EDITABLE_THEME_COLOR_FIELDS`:

- `background`
- `surface`
- `panelBg`
- `text`
- `bodyText`
- `heading`
- `muted`
- `border`
- `codeBg`
- `codeText`
- `link`
- `accent`

Trong Settings, `codeBg` và `codeText` được ghi nhãn là màu cho inline/fallback code để phân biệt với Shiki theme. Chúng áp dụng cho inline code, code fence không được Shiki highlight và các source/fallback view; màu của fenced code đã highlight được cấu hình riêng bằng `syntaxThemeId`.

Các token còn lại được kế thừa từ `baseId`. `resolveThemeById()` merge theo thứ tự built-in base palette trước, sau đó custom `colors` override lên trên.

Mọi màu custom phải là hexadecimal 6 chữ số theo dạng `#RRGGBB`. Alpha hex, named color, `rgb()`, CSS variable và CSS expression không được schema chấp nhận.

### Phân biệt `colors.background` và `theme.background`

Hai field này có tên gần giống nhưng trách nhiệm khác nhau:

- `colors.background` là semantic color token. Nó trở thành `--mdp-bg` và là nền cơ bản/fallback của Viewer.
- `theme.background` là scene descriptor, ví dụ gradient hoặc local image được đặt phía sau Viewer surfaces.

`background.type: 'none'` không có nghĩa Viewer mất nền; Viewer vẫn dùng `colors.background`. `background.type: 'solid'` tạo một visual scene riêng và đồng thời bật translucent/glass treatment cho các surface, vì vậy nó không hoàn toàn tương đương chỉ đổi `colors.background`.

## 6. Từ palette đến CSS variables

`createStyleVars(settings)` resolve active theme rồi tạo CSS custom properties. `applyThemeSettings(target, settings)` ghi chúng lên Viewer root.

Các mapping quan trọng:

| Palette token hoặc setting | CSS variable |
| --- | --- |
| `colorScheme` | `--mdp-color-scheme` |
| `colors.background` | `--mdp-bg`, `--mdp-viewer-background` |
| `surface` | `--mdp-surface`, `--mdp-content-surface` |
| `panelBg` | `--mdp-panel-bg`, `--mdp-sidebar-surface` |
| `text` | `--mdp-text` |
| `bodyText` | `--mdp-body-text` |
| `heading` | `--mdp-heading` |
| `border` | `--mdp-border` |
| `borderStrong` | `--mdp-border-strong` |
| `muted` | `--mdp-muted` |
| `codeBg`, `codeText` | `--mdp-code-bg`, `--mdp-code-text` |
| `link`, `linkSoft` | `--mdp-link`, `--mdp-link-soft` |
| `accent`, `accentSoft` | `--mdp-accent`, `--mdp-accent-soft` |
| Typography settings | `--mdp-font-family`, `--mdp-font-size`, `--mdp-line-height` |
| Layout settings | `--mdp-content-max-width`, `--mdp-toc-width` |

Các token phụ có fallback an toàn trong `createStyleVars()`. Ví dụ, custom theme không cần lưu `accentSoft`; nếu thiếu, resolver dùng `panelBg` hoặc `background` theo fallback chain.

`applyReaderStyles()` trong `src/viewer/app/viewerStyles.js` áp theme variables, sidebar width và typography. Vì variables nằm ở Viewer root, cả article, Files panel, Outline, editor, floating actions, scrollbar và toast có thể dùng cùng semantic palette.

## 7. Theme resolution

Public helpers quan trọng trong `src/theme/index.js`:

| Helper | Trách nhiệm |
| --- | --- |
| `getActiveThemeId(settings)` | Đọc active id với fallback về default. |
| `getCustomThemeById(settings, id)` | Tìm custom theme theo identity. |
| `resolveThemeById(settings, id)` | Chuẩn hóa built-in hoặc custom thành một resolved theme đầy đủ. |
| `resolveActiveTheme(settings)` | Resolve theme đang active. |
| `getThemeColorsForSettings(settings)` | Lấy resolved colors cho Viewer/Mermaid. |
| `getSyntaxThemeIdForSettings(settings)` | Lấy bundled syntax-theme id đã resolve, gồm custom override hoặc fallback theo base. |
| `getThemeOptions(settings)` | Tạo hai danh sách option built-in/custom cho UI. |
| `createCustomThemeDraft(baseId, name)` | Tạo draft custom theme mới từ built-in base. |
| `createThemeAssetId()` | Sinh id riêng cho local image asset. |
| `createStyleVars(settings)` | Chuyển resolved colors và layout/typography thành CSS variables. |
| `applyThemeSettings(target, settings)` | Ghi variables lên DOM target. |

Luồng resolve:

```text
settings.theme.activeId
  -> built-in id?
       -> BUILT_IN_THEME_DEFINITIONS[id]
  -> custom id?
       -> base palette từ BUILT_IN_THEMES[baseId]
       -> merge custom colors
       -> dùng custom background
  -> không tìm thấy
       -> resolve default `light`
```

Resolved theme luôn có `id`, `name`, `source`, `baseId`, `colors` đầy đủ và `background`. Caller không nên tự merge palette hoặc tự tìm custom theme nếu helper hiện có đã bao phủ use case.

## 8. Background descriptor

Supported background types được khai báo bởi `BACKGROUND_TYPES` trong `src/theme/backgrounds.js`:

- `none`
- `solid`
- `gradient`
- `image`

Các field chung:

| Field | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `type` | Một `BACKGROUND_TYPES` value | Chọn shape của descriptor. |
| `motion` | `system`, `on`, `off` | Motion policy của scene. |
| `overlayOpacity` | Số từ `0` đến `0.8` | Lớp tối phủ trên scene để giữ độ đọc được. |

Default descriptor:

```js
{
  type: 'none',
  motion: 'system',
  overlayOpacity: 0.08
}
```

### None

```js
{
  type: 'none',
  motion: 'system',
  overlayOpacity: 0.08
}
```

`resolveBackgroundScene()` trả `kind: 'none'` và `visual: false`. `BackgroundScene` không mount DOM scene, Viewer dùng surface đặc từ palette.

### Solid

```js
{
  type: 'solid',
  color: '#111827',
  motion: 'system',
  overlayOpacity: 0.08
}
```

Solid scene không animate, nhưng vẫn có `visual: true`, nên Viewer bật translucent content/sidebar surfaces và backdrop blur.

### Gradient

Custom linear gradient:

```js
{
  type: 'gradient',
  startColor: '#312e81',
  endColor: '#0f766e',
  angle: 135,
  motion: 'system',
  overlayOpacity: 0.08
}
```

`angle` phải từ 0 đến 360. Resolver tự xây `linear-gradient(...)` từ các giá trị đã được validation; persisted settings không chứa raw CSS gradient.

Built-in Aurora dùng internal preset:

```js
{
  type: 'gradient',
  variant: 'aurora',
  motion: 'system',
  overlayOpacity: 0.08
}
```

`variant: 'aurora'` được resolver chuyển thành nhiều radial gradients và một linear gradient đã tin cậy trong source. Settings UI không expose arbitrary `variant`. Khi tạo custom theme từ Aurora, `createCustomThemeDraft()` chuyển preset Aurora thành một linear gradient editable thông thường.

### Image hoặc animated image

```js
{
  type: 'image',
  assetId: 'theme-asset:12345678',
  assetRevision: 1720000000000,
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}
```

| Field | Rule |
| --- | --- |
| `assetId` | Bắt buộc và match `^theme-asset:[a-z0-9][a-z0-9-]{7,127}$`. |
| `assetRevision` | Safe integer không âm; dùng để invalidate image-loading effect khi asset đổi. |
| `fit` | `cover`, `contain`, hoặc `auto`. |
| `position` | `center`, `top`, `bottom`, `left`, hoặc `right`. |
| `repeat` | Boolean; khi true dùng tiled CSS background thay vì `<img>`. |

Accepted image MIME types là PNG, JPEG, WebP, AVIF, GIF và APNG. File phải có size lớn hơn 0 và không vượt quá 5 MiB. SVG không được chấp nhận làm custom background.

`isAnimatedImageBlob()` đánh dấu GIF và APNG là animated, kiểm tra chunk marker đối với animated PNG/WebP, và kiểm tra `avis` đối với AVIF. Đây là detection thực dụng phục vụ motion behavior, không phải full media parser.

### Motion behavior

Gradient và image scene được đánh dấu `animated: true` để nhận CSS drift, trừ khi `motion` là `off`. CSS `prefers-reduced-motion: reduce` luôn tắt drift. Animated image nội tại cũng bị ẩn khi motion bị tắt hoặc hệ điều hành yêu cầu reduced motion.

Hiện tại `motion: 'on'` không override `prefers-reduced-motion`; accessibility preference vẫn thắng. Khi tab bị ẩn, class `is-paused` pause CSS drift. Browser tự quyết định việc throttle animation nội tại của GIF/APNG/WebP khi page không visible.

### Visual surfaces

Khi scene có `visual: true`, `ViewerShell` thêm class `mdp-root--has-visual-background`. `layout.scss` khi đó đổi sidebar và content surfaces sang `color-mix(..., transparent)` và bật `blur(16px) saturate(122%)`. Khi background là `none`, các surface trở về màu đặc của palette.

Background scene có `position: fixed`, `z-index: 0`, không nhận pointer events. `.mdp-body` ở `z-index: 1`. Scene bị ẩn khi print.

## 9. Vòng đời local image asset

Image descriptor và binary image được cố ý tách riêng:

```text
Theme descriptor
  -> chrome.storage.sync hoặc local fallback
  -> chỉ chứa assetId + presentation metadata

Binary image
  -> IndexedDB `markdown-plus-assets`
  -> object store `background-assets`
  -> record theo assetId trên thiết bị hiện tại
```

### Upload và save

Luồng trong Settings:

```text
ThemeSettings chọn File
  -> useSettingsForm.saveCustomTheme()
  -> validateThemeBackgroundFile()
  -> FileReader tạo data URL
  -> SAVE_THEME_ASSET message
  -> background message router
  -> themeAssetService.saveThemeAsset()
  -> parse lại data URL thành Blob và validate
  -> ghi Blob + cờ animated vào IndexedDB
  -> save theme descriptor với assetId và assetRevision
```

Service chỉ lưu dữ liệu runtime cần dùng: `id`, `blob`, và cờ `animated`.

Upload được lưu trước settings. Nếu save settings thất bại, Options cố xóa asset vừa upload để không tạo orphan. Khi thay ảnh, asset cũ được xóa sau khi settings mới save thành công.

### Load trong Viewer

```text
resolveActiveTheme()
  -> resolveBackgroundScene()
  -> BackgroundScene thấy kind=image
  -> GET_THEME_ASSET message
  -> IndexedDB record được chuyển thành data URL
  -> Viewer parse data URL thành Blob
  -> URL.createObjectURL(blob)
  -> render <img> hoặc tiled background
  -> URL.revokeObjectURL() khi scene đổi hoặc component unmount
```

Nếu asset không tồn tại hoặc IndexedDB không khả dụng, Viewer ghi warning qua shared logger và không render image. Palette background vẫn tồn tại phía sau nên UI không mất toàn bộ nền.

### Delete và reset

Khi xóa custom theme, Options xóa asset mà theme đó tham chiếu sau khi settings save thành công. Nếu theme đang active, active id được chuyển về `baseId` trước khi xóa.

Khi reset toàn bộ settings, background router gọi cả `settingsService.resetSettings()` và `themeAssetService.clearThemeAssets()`. Nếu IndexedDB cleanup thất bại, settings vẫn được reset và lỗi cleanup được log như warning.

### Sync, export và import

Binary asset không sync qua thiết bị. Một image theme descriptor có thể xuất hiện trên thiết bị khác qua sync trong khi IndexedDB ở thiết bị đó không có `assetId` tương ứng; khi đó image không hiển thị.

Settings export hiện chỉ xuất JSON settings và không bundle binary assets. Import JSON cũng không khôi phục image binary. Vì vậy image-backed themes chỉ portable đầy đủ khi tương lai có thêm asset packaging/export format.

Import settings hiện không thực hiện garbage collection cho asset cũ bị bỏ tham chiếu. Save/delete theme qua Settings và reset toàn bộ có cleanup riêng; workflow mới tác động trực tiếp đến `customThemes` cần chủ động xử lý asset lifecycle.

## 10. Settings UI và custom theme workflow

Theme authoring nằm ở Settings → Themes, được compose bởi `OptionsApp.jsx`, màn hình thư viện `ThemeSettings.jsx` và detail view `ThemeEditor.jsx`. Màn hình mặc định chỉ chứa active-theme selector và danh sách custom theme với các thao tác Use, Edit, Delete; Add hoặc Edit mới mở editor, còn Cancel/Save đưa người dùng trở lại thư viện.

Theme editor dùng bố cục workbench hai cột trên màn hình rộng: controls ở bên trái và `ThemePreview` sticky ở bên phải; trên màn hình hẹp preview chuyển lên trên controls. Preview nhận trực tiếp custom-theme draft trong React state nên mọi giá trị hợp lệ được phản ánh ngay, không cần save và không thay đổi active theme thật. Editor cảnh báo trước khi Back hoặc Cancel làm mất draft đã thay đổi.

`ThemePreview` là mô hình thu nhỏ có chủ đích của Viewer, gồm Files panel, document surface, Outline, heading, body text, link, blockquote, code block, table, border, accent state và background scene. Nó dùng `createStyleVars()` và `resolveBackgroundScene()` giống runtime Viewer thay vì tự duy trì một bảng màu riêng. Draft color tạm thời không phải hex hợp lệ sẽ fallback về token tương ứng của built-in base trong preview; schema validation khi save vẫn là source of truth.

Gradient, solid scene, dimming, motion, image fit, position và repeat đều được phản ánh trong preview. File ảnh vừa chọn dùng object URL tạm thời và được revoke khi file hoặc component thay đổi; image asset đã lưu được đọc qua `theme-asset-client`. Preview không persist file, không thay đổi asset lifecycle và không broadcast settings. Animated image được ẩn khi draft đặt motion thành `off`, phù hợp với safety behavior của Viewer; CSS motion vẫn tôn trọng `prefers-reduced-motion`.

Người dùng có thể:

- Chọn active theme.
- Tạo custom theme mới từ base của active theme.
- Đặt tên custom theme.
- Chọn một built-in base theme.
- Chỉnh 12 semantic color tokens được expose.
- Chọn background type và cấu hình các field tương ứng.
- Upload local static hoặc animated image.
- Save hoặc delete custom theme.

Khi nhấn “Add custom theme”, `resolveActiveTheme(settings).baseId` được dùng làm base. Điều này có nghĩa nếu active theme là custom, custom theme mới dùng cùng built-in base chứ không clone toàn bộ custom theme đang active.

`createCustomThemeDraft()` copy giá trị hiện tại của 12 editable token từ built-in base. Khi đổi `baseId`, `rebaseCustomThemeDraft()` nạp lại toàn bộ 12 color input từ built-in base mới và cập nhật nguồn của non-editable tokens. Nếu code highlighting đang ở “Follow base theme”, Shiki mapping đổi theo base mới; một explicit syntax-theme override được giữ nguyên.

Theme editor cho phép chọn “Follow base theme” hoặc một trong 30 syntax themes đã được bundle. Catalog ưu tiên các family phổ biến trong hệ VS Code và cộng đồng theme như GitHub, VS Code Plus, One, Dracula, Monokai, Tokyo Night, Catppuccin, Nord, Solarized, Material, Ayu, Gruvbox, Night Owl, Rosé Pine và Everforest. Selector chia các lựa chọn theo light/dark và live preview tokenizes sample code bằng chính Shiki theme đã resolve; preview dùng JavaScript regex engine riêng để không phụ thuộc quyền thực thi WASM trên extension Options page. Lựa chọn này áp dụng cho fenced code và standalone SQL; CodeMirror editor vẫn sở hữu highlighting riêng.

Khi save thành công, custom theme vừa save trở thành active theme. Việc create/update được phân biệt bằng cách kiểm tra id của draft đã tồn tại trong `settings.theme.customThemes` hay chưa.

Built-in theme không xuất hiện trong custom theme editor và không thể bị rename/delete. Muốn thay đổi built-in cho mọi người dùng, maintainer sửa source. Muốn cá nhân hóa, người dùng tạo custom theme.

## 11. Popup và quick theme toggle

Popup Reader panel gọi `getThemeOptions(settings)` để tạo các option, sau đó chia built-in theme thành hai nhóm “Light themes” và “Dark themes” theo `colorScheme`; custom theme đã lưu nằm trong nhóm “My themes”. Khi chọn, Popup chỉ save `{ theme: { activeId } }`.

Popup có preview nhỏ dựa trên resolved `surface/background`, `text`, và `link`. Preview này không render background image hoặc gradient scene; nó chỉ giúp nhận biết palette.

“Reset reader UI” trong Popup reset `activeId`, typography và layout về default nhưng không xóa `customThemes`. Đây là reset selection và reader preferences, không phải reset toàn bộ theme library.

Floating quick toggle trong Viewer được cố ý giới hạn ở cặp `light` ↔ `dark` bởi `getLightDarkThemeToggleTarget()`. Nếu active theme là custom hoặc một built-in khác, helper trả `null` và quick toggle không đổi theme. Popup/Settings selector vẫn chọn được mọi theme.

## 12. Persistence và live update flow

Popup và Options không truy cập `chrome.storage` trực tiếp. Chúng gọi `saveSettings()` trong `src/settings/settings-client.js`, client gửi `SAVE_SETTINGS`, background router gọi settings service, rồi broadcast `SETTINGS_UPDATED` đến các tab.

```text
Popup hoặc Settings
  -> saveSettings(partial)
  -> SAVE_SETTINGS
  -> settingsService.saveSettings()
  -> deepMerge(current, partial)
  -> normalizeSettings()
  -> chrome.storage
  -> SETTINGS_UPDATED broadcast
  -> content/viewer-loader.js
  -> MarkdownViewerApp.updateSettings()
```

`MarkdownViewerApp.updateSettings()` cập nhật React state và CSS variables ngay, sau đó hỏi `needsFullRender()` có cần render lại Markdown hay không.

Background-only change của active custom theme đi qua style-only path và không full-render Markdown. Palette, `baseId`, hoặc resolved `syntaxThemeId` change của active theme yêu cầu full render vì Shiki code colors được bake vào HTML và Mermaid có thể phụ thuộc theme colors.

Thay đổi một custom theme không active vẫn làm settings object đổi, nhưng `needsFullRender()` so sánh resolved active theme nên có thể bỏ qua full render nếu active palette/base không đổi.

## 13. Shiki, Mermaid và editor

### Shiki

Shiki không dùng custom color token để tự tạo syntax theme. Theme resolver ưu tiên custom `syntaxThemeId` khi có; nếu field là `null` hoặc vắng mặt, `src/theme/syntax-themes.js` map built-in/base id sang một bundled Shiki theme. `src/viewer/core/shiki-config.js` chỉ cho phép các id trong catalog allowlist; runtime highlighter khởi tạo với fallback `github-light` và chỉ tải thêm theme đang active khi cần.

Ví dụ:

| Reader base | Shiki theme |
| --- | --- |
| `light` | `github-light` |
| `dark` | `github-dark` |
| `sakura` | `rose-pine-dawn` |
| `matcha` | `everforest-light` |
| `vscode-dark` | `dark-plus` |
| `aurora-glass` | `night-owl` |

Mọi built-in id phải có mapping sang một Shiki theme đã nằm trong explicit loader allowlist. Custom theme chỉ được lưu `null` hoặc một id trong cùng allowlist; raw theme JSON, CSS và remote theme URL không được chấp nhận. Nếu thêm Shiki theme mới, phải cập nhật cả catalog metadata lẫn static import loader; không dùng variable dynamic import vì Vite có thể kéo toàn bộ theme set vào bundle.

### Mermaid

Official Mermaid renderer dùng resolved theme colors để tạo `themeVariables`; `colorScheme` quyết định Mermaid base/default mode. Vì vậy custom color overrides có tác động đến diagram.

Beautiful Mermaid đọc một phần CSS variables thực tế từ Viewer root, gồm font, background, foreground, border, accent, muted và panel background. Typography change có thể yêu cầu rerender khi Beautiful Mermaid đang active.

### Editor và toàn bộ Viewer chrome

CodeMirror editor theme và Viewer chrome dùng các `--mdp-*` variables thay vì một theme system riêng. Thay đổi semantic tokens vì vậy tác động nhất quán đến article, editor, panels, controls, toast và scrollbars.

## 14. Validation, migration và compatibility

`normalizeSettings()` là schema boundary dùng cho save/import và safe loading. Với `invalid: 'throw'`, dữ liệu sai tạo `SettingsValidationError` kèm `fieldErrors`. Với `invalid: 'default'`, loader cố phục hồi bằng fallback an toàn và bỏ custom theme hỏng.

Validation quan trọng:

- Theme object phải là plain object.
- `customThemes` phải là array và tối đa 32 item.
- Custom id đúng pattern và không trùng.
- Name dài 1–48 ký tự.
- `baseId` phải là built-in id có thật.
- `syntaxThemeId` phải là `null`/vắng mặt hoặc một bundled syntax-theme id có trong allowlist.
- Chỉ editable color keys được giữ lại; color phải là `#RRGGBB`.
- Background type, motion, fit và position phải nằm trong allowlist.
- Gradient angle từ 0 đến 360.
- Overlay opacity từ 0 đến 0.8.
- Image phải có asset id hợp lệ và revision không âm.
- Legacy `appearance.background` bị xóa trong normalization.

Settings version 1 dùng `theme.preset` và có thể có global `appearance.background`. Migration lên version 2 thực hiện:

```text
theme.preset -> theme.activeId
theme.customThemes -> giữ nếu là array, nếu không dùng []
appearance.background -> xóa
version -> 2
```

Nếu một thay đổi tương lai làm persisted shape không còn tương thích, phải tăng cả `DEFAULT_SETTINGS.version` và `CURRENT_SETTINGS_VERSION`, đồng thời thêm migration rõ ràng trong `migrateSettings()`. Không dựa vào deep merge để giả lập migration cho breaking schema.

## 15. Security và privacy boundary

Theme system chỉ cho phép structured data. Không thêm field nhận raw CSS, raw HTML, JavaScript URL, data URL tùy ý hoặc remote URL vào settings.

Gradient CSS được tạo trong trusted resolver từ angle và hai hex colors đã validation. Built-in Aurora CSS nằm trong source code, không đến từ persisted input.

Custom image được giới hạn MIME allowlist và 5 MiB ở cả UI read boundary lẫn background storage boundary. Background service parse data URL lại trước khi ghi Blob vào IndexedDB; không tin dữ liệu chỉ vì nó đến từ Options page.

Custom SVG bị cấm vì SVG có bề mặt tấn công và hành vi external-resource phức tạp hơn raster image. Nếu tương lai hỗ trợ SVG, cần một threat model và sanitizer riêng thay vì chỉ thêm MIME type.

Remote image URL hiện không được hỗ trợ. Thêm remote URL sẽ kéo theo privacy, network permission, CSP, caching, tracking và availability concerns; không nên mở bằng một field string chung.

## 16. Cách thêm built-in theme

Checklist tối thiểu:

1. Tạo palette constant đầy đủ trong `src/theme/index.js` hoặc dùng helper phù hợp như `createDarkThemePalette()`.
2. Thêm `id -> palette` vào `BUILT_IN_THEMES`.
3. Thêm label vào `BUILT_IN_THEME_LABELS`.
4. Cấu hình background descriptor trong `BUILT_IN_THEME_DEFINITIONS`. Khi số theme có background riêng tăng, nên thay ternary Aurora hiện tại bằng một explicit `BUILT_IN_THEME_BACKGROUNDS` map để registry dễ đọc.
5. Thêm built-in/base id vào `PRESET_TO_SHIKI_THEME_ID` trong `src/viewer/core/shiki-config.js`.
6. Nếu Shiki id mới chưa được bundle, thêm explicit loader vào `SHIKI_THEME_LOADERS` và đánh giá bundle size.
7. Xác nhận `getThemeOptions()` tự đưa theme mới vào Popup và Settings selector.
8. Thêm/cập nhật test cho palette, contrast, background, Shiki mapping và option rendering.
9. Chạy test, production build và size report nếu thêm Shiki asset hoặc runtime asset.

Ví dụ hướng cấu hình một built-in solid background:

```js
const BUILT_IN_THEME_BACKGROUNDS = Object.freeze({
  'paper-night': Object.freeze({
    type: BACKGROUND_TYPES.SOLID,
    color: '#111827',
    motion: BACKGROUND_MOTION.OFF,
    overlayOpacity: 0.05
  })
})
```

Registry sau đó chọn descriptor từ map và fallback về `DEFAULT_THEME_BACKGROUND`. Descriptor nên được freeze hoặc clone tại resolver boundary để built-in definition không bị caller mutate.

## 17. Cách thay đổi hoặc thêm editable color

Để expose một token có sẵn cho custom theme:

1. Thêm entry `{ key, label }` vào `EDITABLE_THEME_COLOR_FIELDS`.
2. Bảo đảm mọi built-in palette có giá trị hợp lệ cho key đó hoặc có fallback rõ ràng trong `createStyleVars()`.
3. `ThemeSettings` sẽ tự render color input từ danh sách này.
4. Schema sẽ tự allow key vì nó tạo `EDITABLE_COLOR_KEYS` từ cùng danh sách.
5. Thêm test resolve và CSS variable mapping.

Để tạo một semantic token hoàn toàn mới:

1. Thêm token vào mọi built-in palette hoặc helper tạo palette.
2. Map token sang CSS variable trong `createStyleVars()`.
3. Dùng variable tại component/SCSS consumer.
4. Quyết định token có được custom hay chỉ kế thừa từ base.
5. Kiểm tra contrast và fallback của mọi theme.

Không nên để component đọc trực tiếp `BUILT_IN_THEMES` hoặc hard-code theme id. Component nên dùng CSS semantic variable hoặc resolved theme helper.

## 18. Cách thêm background type mới

Một background capability mới phải đi qua đủ các boundary sau:

1. Thêm enum/type và default liên quan trong `src/theme/backgrounds.js`.
2. Mở rộng `normalizeBackgroundSettings()` bằng validation có allowlist và hard bounds.
3. Mở rộng `resolveBackgroundScene()` để chuyển persisted descriptor thành render-only trusted scene.
4. Thêm authoring controls trong `ThemeSettings.jsx`.
5. Mở rộng `BackgroundScene.jsx` và `_background-scene.scss` nếu renderer mới cần DOM/style khác.
6. Xem xét asset service/message routes nếu loại mới có binary resource.
7. Cập nhật cleanup, reset, replace và import/export behavior.
8. Xác nhận reduced motion, hidden-page behavior, print và fallback.
9. Thêm unit tests cho schema, resolver, renderer styles, asset routing và Settings UI.
10. Nếu persisted shape breaking, tăng settings version và migration.

Giữ descriptor declarative và serializable. Không lưu React props, DOM object, Blob, object URL hoặc CSS text tùy ý vào settings.

## 19. Hướng hỗ trợ packaged image cho built-in theme

Current image path chỉ hỗ trợ local `assetId`, vì vậy không nên giả lập built-in image bằng cách ghi asset vào IndexedDB của user. Hướng mở rộng bền vững là dùng discriminated source:

```js
// Custom/user asset
{
  type: 'image',
  source: {
    kind: 'local',
    assetId: 'theme-asset:12345678',
    revision: 1
  },
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}

// Trusted built-in asset
{
  type: 'image',
  source: {
    kind: 'bundled',
    path: 'theme-backgrounds/cosmos.webp'
  },
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}
```

Custom settings validation chỉ nên cho phép `source.kind: 'local'`. `source.kind: 'bundled'` chỉ đến từ trusted built-in registry và path phải được giới hạn vào một asset directory cụ thể, không nhận arbitrary URL.

`BackgroundScene` có thể dùng theme asset client cho local source và `chrome.runtime.getURL(path)` cho bundled source. Static packaged files nên đặt dưới `public/theme-backgrounds/`; nếu runtime access model yêu cầu, cập nhật `manifest.json` `web_accessible_resources` cùng thay đổi.

Chuyển từ flat `assetId` sang nested `source` là schema change. Nếu thực hiện, tăng settings version và migrate custom image descriptor cũ thành `source: { kind: 'local', assetId, revision }`.

## 20. Hành vi lỗi và fallback

| Tình huống | Hành vi hiện tại |
| --- | --- |
| Active id không tồn tại khi safe load | Quay về `light`. |
| Custom base id sai khi safe load | Quay về default base. |
| Custom theme hỏng khi safe load | Bỏ item hỏng khỏi danh sách. |
| Background type sai khi safe load | Quay về `none`. |
| Image asset không tồn tại | Log warning, không render image, giữ palette background. |
| Upload asset thành công nhưng save settings thất bại | Cố xóa asset vừa upload. |
| Xóa active custom theme | Chuyển active id về base theme rồi xóa. |
| Reset settings nhưng clear IndexedDB thất bại | Settings vẫn reset, cleanup failure được log. |
| Theme id không resolve ở runtime helper | Resolve default `light`. |

Error async không được nuốt im lặng. User-facing Settings flow đưa lỗi vào status UI; background service trả response envelope `{ ok: false, error }`; Viewer asset load ghi warning qua `logger`.

## 21. Testing map

| Phạm vi | Test chính |
| --- | --- |
| Built-in palettes, resolution, CSS vars, contrast | `src/theme/__tests__/theme-vars.test.js` |
| Background descriptor → scene | `src/theme/__tests__/backgrounds.test.js` |
| Theme asset messaging client | `src/theme/__tests__/theme-asset-client.test.js` |
| Settings normalization và validation | `src/settings/__tests__/settings-schema.test.js` |
| Migration, merge, storage | `src/settings/__tests__/settings-service.test.js` |
| Settings authoring markup | `src/options/__tests__/theme-settings.test.js` |
| Popup selector | `src/popup/__tests__/popup-primitives.test.js` |
| Full-render invalidation | `src/shared/__tests__/settings-diff.test.js` |
| Shiki mapping | `src/viewer/core/__tests__/shiki-config.test.js` |
| Background layer/glass/scrollbar CSS | `src/viewer/styles/__tests__/background-scene.test.js` |
| Asset message routes và reset cleanup | `src/background/__tests__/message-router.test.js` |
| File validation và animation detection | `src/shared/__tests__/background-image.test.js` |

Các lệnh verification chuẩn, sau khi bật Node.js 20 hoặc mới hơn:

```bash
npm test
npm run build
npm run size:report
```

Theme behavior thay đổi cần ít nhất chạy `npm test`. Thay đổi packaged/runtime asset cần thêm `npm run build`. Thêm Shiki theme, image bundle hoặc dependency cần thêm `npm run size:report` và so sánh output trước/sau.

Manual smoke test nên bao gồm:

- Chọn từng built-in trong Popup và xác nhận Viewer cập nhật live.
- Tạo, rename, edit và delete custom theme trong Settings.
- Đổi base theme và xác nhận code block dùng Shiki mapping đúng.
- Thử `none`, `solid`, `gradient`, static image và animated image.
- Kiểm tra `cover`, `contain`, `auto`, position và repeat.
- Kiểm tra motion `system/on/off` với reduced-motion của hệ điều hành.
- Reload extension/tab và xác nhận descriptor cùng asset còn hoạt động trên cùng thiết bị.
- Reset reader UI và xác nhận custom theme library không bị xóa.
- Reset toàn bộ settings và xác nhận custom theme/assets bị xóa.
- Print document và xác nhận visual background không xuất hiện.

## 22. Quy tắc review dành cho người và AI

Trước khi merge một thay đổi về theme, trả lời được các câu hỏi sau:

- Dữ liệu mới thuộc palette, background descriptor hay asset storage?
- Nó thuộc từng theme hay vô tình trở thành global appearance state?
- Built-in và custom có đi qua cùng resolver contract không?
- Popup còn là selector-only hay đã bị kéo authoring control trở lại?
- Schema có reject raw CSS, remote URL và invalid color không?
- Asset có cleanup khi replace, delete, reset và save failure không?
- Asset có cần sync/export/import hay chỉ local? UI/tài liệu đã nói rõ chưa?
- Thay đổi có ảnh hưởng Shiki, Mermaid hoặc render invalidation không?
- Có cần settings version bump và migration không?
- Built-in id mới đã có Shiki mapping và test coverage chưa?
- Reduced motion, tab visibility, print và missing-asset fallback đã được kiểm tra chưa?
- Có preserve unrelated worktree changes và không sửa `dist/**` bằng tay không?

## 23. Tóm tắt contract

Contract ngắn gọn nhất của hệ thống là:

```text
Theme = identity + base + semantic colors + owned background

Settings:
  author custom themes
  store descriptors

Popup:
  select only

Resolver:
  built-in/custom -> one complete runtime theme

Viewer:
  CSS variables + background scene + Shiki/Mermaid integration

Local asset service:
  store binary images by assetId on this device
```

Khi thêm tính năng mới, giữ contract này sẽ tránh quay lại mô hình cũ nơi background là một setting toàn cục không gắn với theme.
