// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { CurrentMatchMarker } from '../CurrentMatchMarker.jsx'

let root
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren() })
it('paints outside document DOM, follows layout changes and cleans observers/listeners/frames', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 16))
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() { disconnect() } })
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  const body = document.createElement('div'); body.className = 'mdp-body'; document.body.append(body)
  const article = document.createElement('article'); article.textContent = 'needle'; body.append(article)
  const range = document.createRange(); range.selectNodeContents(article)
  let left = 30
  range.getClientRects = () => [{ left, right: left + 50, top: 60, bottom: 80 }]
  const scrollRoot = { getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 500 }) }
  await act(async () => root.render(React.createElement(CurrentMatchMarker, { range, article, scrollRoot })))
  await act(async () => vi.advanceTimersByTime(16))
  expect(article.textContent).toBe('needle')
  expect(article.querySelector('.mdp-current-match')).toBeNull()
  expect(body.querySelector('.mdp-current-match').textContent).toBe('')
  expect(body.querySelector('.mdp-current-match__box').style.width).toBe('50px')
  expect(document.querySelector('.mdp-current-match__box').style.left).toBe('30px')
  left = 90
  await act(async () => window.dispatchEvent(new Event('scroll')))
  await act(async () => vi.advanceTimersByTime(16))
  expect(document.querySelector('.mdp-current-match__box').style.left).toBe('90px')
  await act(async () => window.dispatchEvent(new Event('scroll')))
  await act(async () => root.unmount()); root = null
  expect(document.querySelector('.mdp-current-match')).toBeNull()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})
