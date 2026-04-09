import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  // Relative base so Vite preloads resolve with `new URL(dep, importerUrl)` against the
  // content-script module (chrome-extension://…/assets/…), not the host document (file:// or https).
  base: './',
  plugins: [crx({ manifest })],
})

