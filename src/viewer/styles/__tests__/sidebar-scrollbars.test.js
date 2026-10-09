import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = name => compile(fileURLToPath(new URL(`../${name}.scss`, import.meta.url))).css
const explorerCss = css('explorer')
const layoutCss = css('layout')
const tocCss = css('toc')
const rules = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...source.matchAll(new RegExp('(?:^|\\n)\\s*' + escaped + '\\s*\\{([^}]*)\\}', 'g'))].map(match => match[1])
}

describe('accepted Viewer sidebar layout', () => {
  it('preserves Files padding and a stable native gutter underneath the shared overlay thumb', () => {
    expect(rules(layoutCss, '.mdp-sidebar--files')[0]).toContain('padding-inline: 8px;')
    expect(explorerCss).not.toContain('.mdp-explorer-container')
    for (const body of [rules(explorerCss, '.mdp-explorer__scroll-region')[0], rules(tocCss, '.mdp-sidebar-panel--outline .mdp-toc')[0]]) {
      expect(body).toContain('overflow-y: auto;')
      expect(body).toContain('scrollbar-gutter: stable;')
      expect(body).toContain('scrollbar-color: transparent transparent;')
    }
    expect(rules(layoutCss, '.mdp-viewer-scrollbar--sidebar')[0]).toContain('width: 8px;')
    expect(rules(layoutCss, '.mdp-viewer-scrollbar--sidebar .mdp-viewer-scrollbar__thumb')[0]).toContain('width: 6px;')
    expect(layoutCss).toMatch(/\.mdp-viewer-scrollbar__thumb\s*\{[^}]*--mdp-scrollbar-thumb/s)
    expect(tocCss).toContain('@media (forced-colors: active)')
  })

  it('keeps heading names on one line with the established hierarchy and pointer targets', () => {
    expect(rules(tocCss, '.mdp-toc__link')[0]).toContain('white-space: nowrap;')
    expect(rules(tocCss, '.mdp-toc__link--h1')[0]).toContain('padding-left: 10px;')
    expect(rules(tocCss, '.mdp-toc__link--h6')[0]).toContain('padding-left: 50px;')
    expect(rules(tocCss, '.mdp-toc__link').at(-1)).toContain('min-height: 44px;')
  })

  it('allocates toolbar width independently of the fixed Outline label', () => {
    expect(rules(layoutCss, '.mdp-right-rail__commands')[0]).toMatch(/flex: 1;[\s\S]*min-width: 0;/)
    expect(rules(layoutCss, '.mdp-right-rail__title')[0]).toContain('flex: 0 0 60px;')
    expect(rules(layoutCss, '.mdp-floating-actions')[0]).toContain('flex-wrap: nowrap;')
    expect(layoutCss).not.toContain('mdp-right-rail__restore')
  })

  it('aligns both secondary rows and list starts while retaining the Files UI', () => {
    const metrics = rules(layoutCss, '.mdp-body').find(body => body.includes('--mdp-sidebar-top-inset'))
    expect(metrics).toContain('--mdp-sidebar-primary-row-height: 36px;')
    expect(metrics).toContain('--mdp-sidebar-secondary-row-height: 44px;')
    expect(metrics).toContain('--mdp-sidebar-content-gap: 12px;')
    const files = rules(explorerCss, '.mdp-explorer__toolbar')[0]
    const outline = rules(tocCss, '.mdp-sidebar-panel--outline .mdp-outline__header')[0]
    for (const body of [files, outline]) {
      expect(body).toContain('min-height: var(--mdp-sidebar-secondary-row-height);')
      expect(body).toContain('border-bottom: 1px solid var(--mdp-border);')
    }
    expect(rules(explorerCss, '.mdp-explorer__scroll-region')[0]).toContain('margin-top: var(--mdp-sidebar-content-gap);')
    expect(outline).toContain('margin-bottom: var(--mdp-sidebar-content-gap);')
    expect(explorerCss).toContain('min-height: 86px;')
    expect(layoutCss).toContain('min-height: 86px;')
  })

  it('separates the #22 face from mouse and touch hit areas and gates motion', () => {
    const target = rules(layoutCss, '.mdp-panel-toggle')[0]
    expect(target).toContain('width: 24px;')
    expect(target).toContain('height: 44px;')
    const face = rules(layoutCss, '.mdp-panel-toggle__face')[0]
    expect(face).toContain('width: 12px;')
    expect(face).toContain('height: 26px;')
    expect(rules(layoutCss, '.mdp-panel-toggle').at(-1)).toContain('width: 44px;')
    expect(layoutCss).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(layoutCss).toContain('animation: mdp-sidebar-light-pass 580ms')
    expect(rules(layoutCss, '.mdp-panel-toggle__chevron')[0]).not.toContain('animation:')
  })

  it('fits collapsed actions using their actual divider spacing and keeps responsive docks', () => {
    const collapsed = '.mdp-body:not(.mdp-body--edit-split):not(.mdp-body--edit-focus) > .mdp-right-rail--outline-collapsed'
    expect(rules(layoutCss, collapsed)[0]).toContain('padding-top: 57.5px;')
    expect(rules(layoutCss, collapsed + ' .mdp-floating-actions')[0]).toContain('--mdp-action-divider-size: 21px;')
    expect(rules(layoutCss, collapsed + ' .mdp-document-actions__divider')[0]).toContain('margin-block: 8px;')
    expect(layoutCss).toContain('padding-top: 103.5px;')
    expect(layoutCss).toContain('@media (max-width: 639px)')
    expect(layoutCss).toContain('width: min(360px, 100vw - 24px);')
  })
})
