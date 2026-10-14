import { afterEach, expect, it, vi } from 'vitest'

const downloads = vi.hoisted(() => ({ trigger: vi.fn() }))
vi.mock('../../../shared/download.js', async importOriginal => ({
  ...await importOriginal(), triggerDownload: downloads.trigger
}))
import { exportAsHtml, exportAsWord } from '../document-actions.js'

afterEach(() => vi.unstubAllGlobals())

it.each([['HTML', exportAsHtml], ['Word HTML', exportAsWord]])('removes viewer color controls from %s export', async (_name, exportDocument) => {
  downloads.trigger.mockClear()
  class TestElement {}
  vi.stubGlobal('HTMLElement', TestElement)
  const clone = Object.assign(new TestElement(), {
    innerHTML: '<p><button class="mdp-color-swatch"></button><code>#3B82F6</code></p>',
    querySelector: () => null,
    querySelectorAll: selector => selector.includes('.mdp-color-swatch') ? [{ remove() {
      clone.innerHTML = '<p><code>#3B82F6</code></p>'
    } }] : []
  })
  await exportDocument({ cloneNode: () => clone }, {}, 'colors.html')
  const html = await downloads.trigger.mock.calls[0][0].blob.text()
  expect(html).not.toContain('mdp-color-swatch')
  expect(html).toContain('<code>#3B82F6</code>')
})
