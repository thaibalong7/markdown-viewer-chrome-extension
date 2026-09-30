import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import manifest from './manifest.json'

const KATEX_CSS_PATH_SUFFIX = '/katex/dist/katex.min.css'
const KATEX_FONT_FALLBACK_RE =
  /url\(([^)]*\.woff2)\)\s*format\((["'])woff2\2\)\s*,\s*url\([^)]*\.woff\)\s*format\((["'])woff\3\)\s*,\s*url\([^)]*\.ttf\)\s*format\((["'])truetype\4\)/g

function katexWoff2Only() {
  return {
    name: 'markdown-plus:katex-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replaceAll('\\', '/').split('?', 1)[0]
      if (!normalizedId.endsWith(KATEX_CSS_PATH_SUFFIX)) return null

      let replacementCount = 0
      const transformedCode = code.replace(KATEX_FONT_FALLBACK_RE, (_, woff2Url) => {
        replacementCount += 1
        return `url(${woff2Url}) format("woff2")`
      })

      if (!replacementCount) {
        this.error('KaTeX font sources changed; the WOFF2-only build transform needs updating.')
      }

      return {
        code: transformedCode,
        map: null
      }
    }
  }
}

export default defineConfig({
  // Relative base so Vite preloads resolve with `new URL(dep, importerUrl)` against the
  // content-script module (chrome-extension://…/assets/…), not the host document (file:// or https).
  base: './',
  test: {
    include: ['src/**/__tests__/**/*.test.{js,mjs}'],
    environment: 'node'
  },
  plugins: [
    katexWoff2Only(),
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
    chunkSizeWarningLimit: 500
  }
})
