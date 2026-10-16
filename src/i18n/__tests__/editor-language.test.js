// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { getSearchQuery, openSearchPanel, SearchQuery, setSearchQuery } from '@codemirror/search'
import { undo, undoDepth } from '@codemirror/commands'
import { EditorPanel } from '../../viewer/react/components/EditorPanel.jsx'
import { loadCodemirror } from '../../viewer/editor/codemirror-bundle.js'
import { setLanguage } from '../index.js'

let root, host

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  host?.remove()
  setLanguage('en')
  vi.unstubAllGlobals()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

it('switches an open search panel through Chinese while retaining query, focus, draft and undo', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  // jsdom has no layout; avoid scheduling CodeMirror measurements in this DOM test.
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  await loadCodemirror()
  setLanguage('en')
  host = document.createElement('div'); document.body.append(host)
  root = createRoot(host)
  const source = '# 中文草稿\noptions.general.title'
  const ready = vi.fn()
  await act(async () => root.render(React.createElement(EditorPanel, { markdown: source, onEditorReady: ready })))
  expect(ready).toHaveBeenCalledTimes(1)
  const editor = host.querySelector('.cm-editor')
  const view = EditorView.findFromDOM(editor)
  view.dispatch({ changes: { from: source.length, insert: '\n未保存的更改' } })
  const draft = view.state.doc.toString()
  const depth = undoDepth(view.state)
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: 'options.general.title', replace: '保留原文', caseSensitive: true })) })
  openSearchPanel(view)
  const field = host.querySelector('.cm-search input[name="search"]')
  field.focus(); field.setSelectionRange(2, 7)

  for (const language of ['zh-CN', 'vi', 'zh-CN', 'en']) {
    await act(async () => setLanguage(language))
    expect(host.querySelector('.cm-editor')).toBe(editor)
    expect(view.state.doc.toString()).toBe(draft)
    expect(undoDepth(view.state)).toBe(depth)
    expect(ready).toHaveBeenCalledTimes(1)
    const query = getSearchQuery(view.state)
    expect(query.search).toBe('options.general.title')
    expect(query.replace).toBe('保留原文')
    expect(query.caseSensitive).toBe(true)
    const current = host.querySelector('.cm-search input[name="search"]')
    expect(document.activeElement).toBe(current)
    expect([current.selectionStart, current.selectionEnd]).toEqual([2, 7])
    if (language === 'zh-CN') {
      expect(current.getAttribute('aria-label')).toBe('查找')
      expect(host.querySelector('.cm-search').textContent).toContain('全部替换')
    }
  }
  expect(undo(view)).toBe(true)
  expect(view.state.doc.toString()).toBe(source)
})
