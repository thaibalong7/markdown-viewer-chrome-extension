import { afterEach, expect, it, vi } from 'vitest'

const downloads = vi.hoisted(() => ({ trigger: vi.fn() }))
vi.mock('../../../shared/download.js', async importOriginal => ({
  ...await importOriginal(), triggerDownload: downloads.trigger
}))
// Vitest stubs CSS imports by default; use the actual compiled export stylesheet.
vi.mock('../../styles/content/_alerts.scss?inline', async () => {
  const { compile } = await import('sass')
  const { fileURLToPath } = await import('node:url')
  return { default: compile(fileURLToPath(new URL('../../styles/content/_alerts.scss', import.meta.url))).css }
})
import { exportAsHtml, exportAsWord } from '../document-actions.js'

afterEach(() => vi.unstubAllGlobals())

it.each([['HTML', exportAsHtml, 'alerts.html'], ['Word HTML', exportAsWord, 'alerts.doc']])('includes themed alert styles and labels in %s export', async (_format, exportDocument, filename) => {
  downloads.trigger.mockClear()
  class TestElement {}
  vi.stubGlobal('HTMLElement', TestElement)
  const clone = Object.assign(new TestElement(), {
    innerHTML: '<div class="mdp-alert mdp-alert--warning"><p class="mdp-alert__title">Warning</p><p>Content</p></div>',
    querySelectorAll: () => [], querySelector: () => null
  })
  await exportDocument({ cloneNode: () => clone }, { theme: { activeId: 'dark' } }, filename)
  const { blob, filename: downloadedName } = downloads.trigger.mock.calls[0][0]
  const html = await blob.text()
  expect(downloadedName).toBe(filename)
  expect(html).toContain('mdp-alert--warning')
  expect(html).toContain('>Warning</p>')
  expect(html).toContain('var(--mdp-toast-warning-text)')
  expect(html).toContain('var(--mdp-toast-warning-bg)')
  expect(html).toContain('--mdp-toast-warning-text: #fde68a')
})
