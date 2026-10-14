// @vitest-environment jsdom
import React, { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountContentUi, clearContentUi, destroyContentUi, batchContentUi } from '../mount-content-ui.jsx'
import { createArticle, cleanDom } from './dom-test-helpers.js'
import { renderIntoElement } from '../../../core/renderer.js'

afterEach(cleanDom)
function Control({ label, onCleanup }) {
  useEffect(() => onCleanup, [onCleanup])
  return React.createElement('button', null, label)
}
describe('document / React DOM ownership', () => {
  it('shares one root across slots, updates one control without remounting siblings', () => {
    const article = createArticle()
    const first = document.createElement('div'), second = document.createElement('div')
    article.append(first, second)
    const cleaned = vi.fn()
    let a, b
    batchContentUi(article, () => {
      a = mountContentUi(first, Control, { label: 'A', onCleanup: cleaned })
      b = mountContentUi(second, Control, { label: 'B', onCleanup: cleaned })
    })
    expect(article.parentElement.querySelectorAll('.mdp-content-ui-host')).toHaveLength(1)
    const buttonB = second.firstElementChild
    a.update({ label: 'Updated A', onCleanup: cleaned })
    expect(first.textContent).toBe('Updated A')
    expect(second.firstElementChild).toBe(buttonB)
    expect(cleaned).not.toHaveBeenCalled()
    a.destroy(); a.destroy(); b.destroy()
    expect(cleaned).toHaveBeenCalledTimes(2)
  })
  it('cleans slots and their out-of-article overlays before sanitized HTML replacement', () => {
    const article = createArticle()
    const slot = document.createElement('div'); article.append(slot)
    const cleaned = vi.fn(() => expect(slot.isConnected).toBe(true))
    mountContentUi(slot, Control, { label: 'Toolbar', onCleanup: cleaned })
    const overlayCleanup = vi.fn()
    mountContentUi(article.parentElement, Control, { label: 'Overlay', onCleanup: overlayCleanup }, { scope: article })
    renderIntoElement(article, '<pre><code>Original source</code></pre>')
    expect(cleaned).toHaveBeenCalledOnce()
    expect(overlayCleanup).toHaveBeenCalledOnce()
    expect(article.textContent).toBe('Original source')
    expect(article.parentElement.textContent).not.toContain('Overlay')
  })
  it('ignores stale handles after scope teardown and can destroy idempotently', () => {
    const article = createArticle()
    const handle = mountContentUi(article, Control, { label: 'Old' })
    clearContentUi(article)
    handle.update({ label: 'Stale' })
    expect(article.textContent).toBe('')
    destroyContentUi(article)
    destroyContentUi(article)
    handle.destroy()
    expect(article.parentElement.querySelector('.mdp-content-ui-host')).toBeNull()
  })
  it('keeps controls in other documents alive when one scope is cleared', () => {
    const article = createArticle()
    const other = document.createElement('section'); article.parentElement.append(other)
    mountContentUi(article, Control, { label: 'Document' })
    mountContentUi(other, Control, { label: 'Other UI' })
    clearContentUi(article)
    expect(other.textContent).toBe('Other UI')
  })
})
