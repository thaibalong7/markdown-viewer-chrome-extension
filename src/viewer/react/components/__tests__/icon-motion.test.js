// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { compile } from 'sass'
import { resolve } from 'node:path'
import { DocumentActionIcon } from '../DocumentActionIcon.jsx'
import { APPLICATION_ICONS } from '../../../../shared/icons/application-icons.js'

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals() })

describe('Viewer icon motion', () => {
  it.each([['copy', 'link', 'check'], ['theme', 'moon', 'sun'], ['edit', 'edit', 'check'], ['view-mode', 'source', 'reader']])(
    'keeps %s glyphs mounted and the focused control stable during both transitions', async (id, from, to) => {
      vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
      const host = document.createElement('div'); document.body.append(host)
      const root = createRoot(host)
      const render = icon => root.render(React.createElement('button', { 'aria-label': 'Action' },
        React.createElement(DocumentActionIcon, { action: { id, icon } })))
      await act(async () => render(from))
      const button = host.querySelector('button'); button.focus()
      const layers = [...button.querySelectorAll('svg')]
      await act(async () => render(to))
      expect(document.activeElement).toBe(button)
      expect([...button.querySelectorAll('svg')]).toEqual(layers)
      expect(button.querySelector('.mdp-icon-swap').dataset.swapped).toBe('true')
      expect(layers.map(layer => layer.getAttribute('data-icon-visible'))).toEqual(['false', 'true'])
      expect(button.textContent).toBe('')
      if (to === 'check') expect(layers[1].querySelector('path').getAttribute('d')).toBe(APPLICATION_ICONS.check.elements[0][1].d)
      await act(async () => render(from))
      expect(button.querySelector('.mdp-icon-swap').dataset.swapped).toBe('false')
      expect(layers.map(layer => layer.getAttribute('data-icon-visible'))).toEqual(['true', 'false'])
      expect(document.activeElement).toBe(button)
      await act(async () => root.unmount())
    })

  it('limits decorative motion to Viewer controls, excludes busy/local animations and removes movement under reduced motion', () => {
    const css = compile(resolve('src/viewer/styles/_icon-motion.scss')).css
    expect(css).toContain(':not(:disabled, [aria-disabled=true], [aria-busy=true])')
    expect(css).toContain('svg[data-mdp-icon]')
    expect(css).not.toMatch(/\.mdp-root\s+svg\s*\{/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important;\s*transition: none;\s*transform: none;/)
    expect(css).toContain('color: var(--mdp-toast-success-text)')
    expect(css).toContain('background: var(--mdp-toast-success-bg)')
    expect(css).toContain('border-color: var(--mdp-toast-success-border)')
  })
})
