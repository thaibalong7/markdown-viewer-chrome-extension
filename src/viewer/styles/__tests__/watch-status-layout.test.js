import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const watchCss = compile(fileURLToPath(new URL('../_watch-status.scss', import.meta.url))).css
const warningCss = compile(fileURLToPath(new URL('../_editor-update-confirmation.scss', import.meta.url))).css

it('uses a wider editor-update panel and anchors its primary action to the content width', () => {
  expect(watchCss).toMatch(/\.mdp-watch-status__panel--editor-update\s*\{[^}]*width:\s*min\(336px, 100vw - 24px\);/s)
  expect(watchCss).toMatch(/\.mdp-watch-status__panel--editor-update \.mdp-watch-status__actions \.mdp-ui-button\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*38px;/s)
})

it('keeps layout overrides on top of shared notice and card primitives', () => {
  expect(warningCss).toMatch(/\.mdp-editor-update-warning--compact\s*\{[^}]*margin:\s*12px 0 0;[^}]*padding:\s*8px 12px;/s)
  expect(warningCss).toMatch(/\.mdp-editor-update-confirmation\s*\{[^}]*width:\s*min\(520px, 100%\);[^}]*box-shadow:\s*var\(--mdp-shadow-float\);/s)
  expect(warningCss).not.toContain('#101828')
})
