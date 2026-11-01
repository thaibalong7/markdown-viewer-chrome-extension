import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)
const behavior = readFileSync(new URL('site/assets/site.js', root), 'utf8')

function loadPage(path, hash = '') {
  const html = readFileSync(new URL(`site/${path}`, root), 'utf8')
  const dom = new JSDOM(html, { url: `https://example.test/project/${path}${hash}`, runScripts: 'outside-only', pretendToBeVisual: true })
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {} })
  dom.window.eval(behavior)
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))
  return dom
}

describe('localized public website interactions', () => {
  it('keeps the guide chapter when switching languages and applies its theme controls', () => {
    const dom = loadPage('vi/guide/index.html', '#themes')
    const { document } = dom.window
    const english = document.querySelector('[data-language-link][hreflang="en"]')
    expect(english.href).toBe('https://example.test/project/guide/#themes')
    document.querySelector('[data-theme-choice="dark"]').click()
    expect(document.documentElement.dataset.theme).toBe('dark')
    dom.window.close()
  })

  it('closes the mobile guide contents and focuses the chapter without IntersectionObserver', () => {
    const dom = loadPage('zh-CN/guide/index.html')
    const { document } = dom.window
    const contents = document.querySelector('.mobile-toc')
    contents.open = true
    contents.querySelector('a[href="#editor"]').click()
    expect(contents.open).toBe(false)
    expect(document.activeElement).toBe(document.querySelector('#editor'))
    dom.window.close()
  })

  it('tracks the active chapter when scrolling through a long guide section', async () => {
    const dom = loadPage('guide/index.html')
    const { document } = dom.window
    document.documentElement.style.scrollPaddingTop = '120px'
    const sections = [...document.querySelectorAll('.guide-section')]
    sections.forEach((section, index) => {
      section.getBoundingClientRect = () => ({ top: index === 0 ? -1800 : index === 1 ? 144 : 2600 })
    })
    dom.window.dispatchEvent(new dom.window.Event('scroll'))
    await new Promise((resolve) => dom.window.requestAnimationFrame(resolve))
    expect(document.querySelector('.desktop-toc [aria-current="location"]').hash).toBe('#workspace')
    expect(document.querySelector('.mobile-toc [aria-current="location"]').hash).toBe('#workspace')
    dom.window.close()
  })

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
