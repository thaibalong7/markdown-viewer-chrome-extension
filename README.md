# markdown-plus

A Chrome Extension that detects Markdown pages and turns raw text into a clean reading experience with TOC, themes, and customizable settings.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- Auto-detects Markdown-like pages.
- Renders content in a readable viewer layout.
- Left sidebar Table of Contents with heading navigation.
- Reader theme presets and typography controls.
- Built-in plugin system with core plugins enabled by default.
- User settings persisted through browser storage.

## Quick Start

### Prerequisites

- Node.js 20+
- Google Chrome (Developer Mode enabled)

### Install

```bash
nvm use 20
npm install
```

### Run in development

```bash
nvm use 20
npm run dev
```

### Build

```bash
nvm use 20
npm run build
```

### Load extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder (after build).
5. Open a `.md` page and verify the viewer is applied.

## Development

Available scripts:

- `npm run dev` - Start Vite development workflow.
- `npm run build` - Build production extension output.
- `npm run watch` - Build in watch mode.
- `npm run preview` - Preview built output.

Development notes:

- Use Node 20 (`nvm use 20`) before running npm scripts.
- Treat `src/**`, `manifest.json`, and `vite.config.mjs` as source of truth.
- Do not edit `dist/**` manually; regenerate it with `npm run build`.

## Project Structure

- `src/content` - Page detection, extraction, and viewer bootstrapping.
- `src/viewer` - Viewer UI, rendering flow, TOC, and settings drawer.
- `src/plugins` - Plugin manager, plugin types, and core plugins.
- `src/settings` - Default settings and persistence layer.
- `src/background` - Runtime messaging and settings handlers.

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch:
   - `feature/<name>` or `fix/<name>`
2. Ensure Node 20 is active:
   - `nvm use 20`
3. Implement your changes in `src/**`.
4. Validate your changes:
   - Run `npm run build`
   - Load the extension and test with real Markdown pages
5. Open a Pull Request with:
   - Problem statement
   - Approach
   - Test steps
   - Screenshots/GIFs for UI changes (if applicable)

## License

MIT (or project owner decision).
