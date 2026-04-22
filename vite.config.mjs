import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import manifest from './manifest.json'

export default defineConfig({
  // Relative base so Vite preloads resolve with `new URL(dep, importerUrl)` against the
  // content-script module (chrome-extension://…/assets/…), not the host document (file:// or https).
  base: './',
  plugins: [
    react(),
    crx({ manifest }),
    process.env.ANALYZE === '1'
      ? visualizer({
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          open: false
        })
      : null
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/markdown-it') || id.includes('node_modules/markdown-it-anchor')) {
            return 'markdown-core'
          }
          if (id.includes('node_modules/dompurify')) {
            return 'sanitizer'
          }
          return null
        }
      }
    }
  }
})

