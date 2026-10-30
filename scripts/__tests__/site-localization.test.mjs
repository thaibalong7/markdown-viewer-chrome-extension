import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)
const behavior = readFileSync(new URL('site/assets/site.js', root), 'utf8')

function loadPage(path, hash = '') {
  const html = readFileSync(new URL(`site/${path}`, root), 'utf8')
  const dom = new JSDOM(html, { url: `https://example.test/project/${path}${hash}`, runScripts: 'outside-only' })
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {} })
  dom.window.eval(behavior)
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))
  return dom
}

describe('localized public website interactions', () => {
  it('keeps the current policy section when choosing another language', () => {
    const dom = loadPage('vi/privacy/index.html', '#permissions')
    const { document } = dom.window
    const chinese = document.querySelector('[data-language-link][hreflang="zh-CN"]')
    expect(chinese.href).toBe('https://example.test/project/zh-CN/privacy/#permissions')
    dom.window.location.hash = '#your-controls'
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'))
    expect(chinese.hash).toBe('#your-controls')
    dom.window.close()
  })

  it('closes the language disclosure with Escape and returns keyboard focus', () => {
    const dom = loadPage('zh-CN/index.html')
    const { document, KeyboardEvent } = dom.window
    const menu = document.querySelector('.language-control')
    menu.open = true
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(menu.open).toBe(false)
    expect(document.activeElement).toBe(menu.querySelector('summary'))
    menu.open = true
    document.querySelector('main').click()
    expect(menu.open).toBe(false)
    dom.window.close()
  })

  it('preserves the Reader/Source demo and theme controls on a localized page', () => {
    const dom = loadPage('vi/index.html')
    const { document } = dom.window
    document.querySelector('[data-demo-mode="source"]').click()
    expect(document.querySelector('#sample-source').hidden).toBe(false)
    expect(document.querySelector('#sample-reader').hidden).toBe(true)
    document.querySelector('[data-theme-choice="dark"]').click()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(dom.window.localStorage.getItem('mdp-site-theme')).toBe('dark')
    expect(document.documentElement.lang).toBe('vi')
    dom.window.close()
  })
})
