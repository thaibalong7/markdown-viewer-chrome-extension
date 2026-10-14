import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

// Use an installed Playwright or the bundled desktop runtime; no project dependency is required.
const { chromium } = await import(process.env.MDP_ARTWORK_PLAYWRIGHT || 'playwright')
const root = path.dirname(fileURLToPath(import.meta.url))
const output = path.resolve(root, '../../../assets/chrome-web-store')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const [asset, width, height, filename] of [
    ['small', 440, 280, 'small-promo-tile.png'],
    ['marquee', 1400, 560, 'marquee.png']
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
    const url = pathToFileURL(path.join(root, 'artwork.html'))
    url.searchParams.set('asset', asset)
    await page.goto(url.href, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map(image => image.decode()))
    })
    if (errors.length) throw new Error(errors.join('\n'))
    await page.screenshot({ path: path.join(output, filename), animations: 'disabled' })
    console.log(`${filename}: ${width} × ${height}`)
    await page.close()
  }
} finally {
  await browser.close()
}
