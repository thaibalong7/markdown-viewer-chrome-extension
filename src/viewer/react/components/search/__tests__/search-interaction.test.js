// @vitest-environment jsdom
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SearchProvider, useSearch } from '../../../contexts/SearchContext.jsx'
import { EditorProvider } from '../../../contexts/EditorContext.jsx'
import { DocumentFind } from '../DocumentFind.jsx'
import { WorkspaceSearch } from '../WorkspaceSearch.jsx'
import { SearchSnippet } from '../WorkspaceSearch.jsx'
import { renderToStaticMarkup } from 'react-dom/server'

let root
let container
let model
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  container.className = 'mdp-root'
  document.body.append(container)
  root = createRoot(container)
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 16))
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
})
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren() })
const press = (node, key, modifiers = {}) => node.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers }))
function Model() { model = useSearch(); return null }
function Harness({ bridge, state }) {
  const [article, setArticle] = useState(null)
  return React.createElement(EditorProvider, null, React.createElement(SearchProvider, null,
    React.createElement(Model),
    React.createElement('button', { id: 'origin' }, 'Origin'),
    React.createElement('div', { className: 'cm-editor' }, React.createElement('input', { 'aria-label': 'Editor' })),
    React.createElement('article', { ref: setArticle }, React.createElement('p', null, 'hello ', React.createElement('strong', null, 'hello'))),
    React.createElement(DocumentFind, { article, root: container, scrollRoot: container, documentKey: 'one', bridge }),
    state ? React.createElement(WorkspaceSearch, { state, bridge, actions: {}, expanded: true }) : null
  ))
}

it('opens/reuses document Find, wraps Enter navigation, restores focus and defers to the focused editor', async () => {
  await act(async () => root.render(React.createElement(Harness)))
  document.querySelector('#origin').focus()
  await act(async () => press(document.activeElement, 'f', { ctrlKey: true }))
  const input = document.querySelector('input[type="search"]')
  expect(document.activeElement).toBe(input)
  await act(async () => model.setFindQuery('hello'))
  await act(async () => vi.advanceTimersByTime(110))
  expect(container.textContent).toContain('1/2')
  await act(async () => press(input, 'Enter'))
  expect(container.textContent).toContain('2/2')
  await act(async () => press(input, 'Enter'))
  expect(container.textContent).toContain('1/2')
  await act(async () => press(input, 'Enter', { shiftKey: true }))
  expect(container.textContent).toContain('2/2')
  await act(async () => press(input, 'Escape'))
  expect(document.activeElement.id).toBe('origin')
  expect(container.querySelector('.mdp-find')).toBeNull()
  const editor = container.querySelector('.cm-editor input')
  editor.focus()
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'f', ctrlKey: true })
  await act(async () => editor.dispatchEvent(event))
  expect(event.defaultPrevented).toBe(false)
  expect(container.querySelector('.mdp-find')).toBeNull()
})

it('opens workspace search from the editor and ignores late results from replaced queries', async () => {
  let resolveOld
  const href = 'mdp-ws-file:root%2Fone.md'
  const bridge = { getWorkspaceReader: () => ({ text: () => new Promise((resolve) => { resolveOld = resolve }) }) }
  const state = { explorerMode: 'workspace', view: 'tree', tree: { type: 'folder', name: 'root', children: [{ type: 'file', name: 'one.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  const editor = container.querySelector('.cm-editor input')
  editor.focus()
  await act(async () => press(editor, 'F', { ctrlKey: true, shiftKey: true }))
  expect(model.workspace.open).toBe(true)
  expect(document.activeElement.getAttribute('aria-label')).toBe('Search workspace')
  await act(async () => model.openWorkspace('old'))
  await act(async () => vi.advanceTimersByTime(251))
  expect(resolveOld).toBeTypeOf('function')
  await act(async () => model.openWorkspace('new'))
  await act(async () => resolveOld('old result'))
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(0)
  expect(container.querySelector('.mdp-workspace-search input').value).toBe('new')
  await act(async () => model.setWorkspaceQuery('remember this'))
  await act(async () => model.closeWorkspace())
  await act(async () => model.openWorkspace())
  expect(container.querySelector('.mdp-workspace-search input').value).toBe('remember this')
})

it('renders literal snippets safely and offers workspace escalation without changing scope automatically', async () => {
  const html = renderToStaticMarkup(React.createElement(SearchSnippet, { match: { snippet: '<script>alert(1)</script>', snippetFrom: 8, snippetTo: 13 } }))
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  await act(async () => root.render(React.createElement(Harness)))
  await act(async () => model.openFind('missing'))
  await act(async () => vi.advanceTimersByTime(110))
  expect(container.textContent).toContain('No matches in this document.')
  expect(model.workspace.open).toBe(false)
  const button = container.querySelector('.mdp-find__hint button')
  await act(async () => button.click())
  expect(model.workspace).toMatchObject({ open: true, query: 'missing' })
  expect(container.querySelector('.mdp-find')).toBeNull()
})

it('searches the current Folder tree immediately without asking for a workspace picker', async () => {
  const href = 'file:///notes/one.md'
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'needle in current draft' }) }
  const state = { explorerMode: 'sibling', view: 'tree', tree: { type: 'folder', name: 'notes', children: [{ type: 'file', name: 'one.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('needle'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(1)
  expect(container.querySelector('.mdp-workspace-search input').getAttribute('aria-label')).toBe('Search folder')
  expect(container.textContent).not.toContain('Choose folder')
  expect(container.textContent).toContain('Unsaved')
})

it('searches a flat fallback and labels the result scope as incomplete', async () => {
  const href = 'file:///notes/one.md'
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'needle' }) }
  const state = { explorerMode: 'sibling', view: 'files', files: [{ displayName: 'one.md', href }] }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('needle'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(1)
  expect(container.textContent).toContain('subfolders may be missing')
})

it('clears a query with the explicit control and keeps focus in the same input', async () => {
  await act(async () => root.render(React.createElement(Harness)))
  await act(async () => model.openFind('hello'))
  const input = container.querySelector('.mdp-find input')
  await act(async () => container.querySelector('.mdp-search-field__clear').click())
  expect(model.find.query).toBe('')
  expect(container.querySelector('.mdp-find input')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(container.querySelector('.mdp-search-field__clear')).toBeNull()
})

it('keeps the hit separate from its short context and selects the activated result row', async () => {
  const href = 'file:///notes/a.md'
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'prefix needle suffix', editor: { revealSearchMatch: vi.fn() } }), navigateToFile: async () => true }
  const state = { explorerMode: 'sibling', view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('needle'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  const row = container.querySelector('.mdp-workspace-search__match')
  expect(row.querySelector('mark').textContent).toBe('needle')
  expect(row.querySelector('.mdp-workspace-search__line').textContent).toBe('1')
  expect(row.getAttribute('aria-label')).toContain('column 8')
  await act(async () => row.click())
  expect(row.getAttribute('aria-current')).toBe('location')
})

it('recomputes document matches and preserves matching modes when opening workspace search', async () => {
  const href = 'file:///notes/a.md'
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'hello Hello' }) }
  const state = { explorerMode: 'sibling', view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openFind('Hello'))
  await act(async () => vi.advanceTimersByTime(110))
  expect(container.querySelector('.mdp-find__count').textContent).toBe('1/2')
  const toggle = container.querySelector('.mdp-find [aria-label="Match case"]')
  expect(toggle.getAttribute('aria-pressed')).toBe('false')
  await act(async () => toggle.click())
  await act(async () => vi.advanceTimersByTime(110))
  expect(toggle.getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelector('.mdp-find__count').textContent).toBe('0/0')
  await act(async () => model.openWorkspace('Hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  expect(container.querySelector('.mdp-workspace-search [aria-label="Match case"]').getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(1)
  expect(container.querySelector('.mdp-workspace-search__match mark').textContent).toBe('Hello')
})

it('invalidates pending reads when matching options change and highlights original accented source', async () => {
  const resolvers = []
  const href = 'mdp-ws-file:root%2Fone.md'
  const bridge = { getWorkspaceReader: () => ({ text: () => new Promise(resolve => resolvers.push(resolve)) }) }
  const state = { explorerMode: 'workspace', view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'one.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('hai'))
  await act(async () => vi.advanceTimersByTimeAsync(251))
  await act(async () => container.querySelector('.mdp-workspace-search [aria-label="Match diacritics"]').click())
  await act(async () => resolvers[0]('hai hải'))
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(0)
  await act(async () => vi.advanceTimersByTimeAsync(251))
  await act(async () => resolvers[1]('hai hải'))
  await act(async () => vi.advanceTimersByTimeAsync(10))
  expect([...container.querySelectorAll('.mdp-workspace-search__match mark')].map(n => n.textContent)).toEqual(['hai', 'hải'])
})

it('retains old rows/selection/scroll while waiting, blocks stale activation and flushes Enter/refresh immediately', async () => {
  const href = 'file:///notes/a.md'
  const getSearchDocument = vi.fn(() => ({ href, dirty: true, text: 'hello world', editor: { revealSearchMatch() {} } }))
  const navigateToFile = vi.fn(async () => true)
  const bridge = { getSearchDocument, navigateToFile }
  const state = { view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  const oldRow = container.querySelector('.mdp-workspace-search__match')
  await act(async () => oldRow.click())
  const results = container.querySelector('.mdp-workspace-search__results')
  results.scrollTop = 77
  getSearchDocument.mockClear(); navigateToFile.mockClear()
  await act(async () => model.setWorkspaceQuery('world'))
  expect(results.querySelector('button')).toBe(oldRow)
  expect(oldRow.getAttribute('aria-current')).toBe('location')
  expect(oldRow.disabled).toBe(true)
  expect(results.scrollTop).toBe(77)
  await act(async () => oldRow.click())
  expect(navigateToFile).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTimeAsync(200))
  expect(getSearchDocument).not.toHaveBeenCalled()
  await act(async () => press(container.querySelector('.mdp-workspace-search input'), 'Enter'))
  expect(getSearchDocument).toHaveBeenCalledTimes(1)
  await act(async () => vi.advanceTimersByTimeAsync(10))
  expect(results.querySelector('mark').textContent).toBe('world')
  getSearchDocument.mockClear()
  await act(async () => container.querySelector('.mdp-workspace-search [aria-label="Search again"]').click())
  expect(getSearchDocument).toHaveBeenCalledTimes(1)
})

it('highlights a rendered result without opening Find or stealing list focus and clears it on close', async () => {
  const highlights = new Map()
  vi.stubGlobal('CSS', { highlights })
  vi.stubGlobal('Highlight', class { constructor(...ranges) { this.ranges = ranges } })
  const href = 'file:///notes/a.md'
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'hello hello' }), navigateToFile: async () => true, getArticleEl: () => container.querySelector('article') }
  const state = { view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  const row = container.querySelector('.mdp-workspace-search__match')
  await act(async () => row.click())
  await act(async () => vi.advanceTimersByTimeAsync(110))
  expect(model.find.open).toBe(false)
  expect(container.querySelector('.mdp-find')).toBeNull()
  expect(document.activeElement).toBe(row)
  expect(highlights.get('mdp-find-current').ranges[0].toString()).toBe('hello')
  await act(async () => model.closeWorkspace())
  expect(highlights.has('mdp-find-current')).toBe(false)
})

it('moves among results with arrows and opens next/previous matches with F4 without focusing Find', async () => {
  const href = 'file:///notes/a.md'
  const revealSearchMatch = vi.fn()
  const bridge = { getSearchDocument: () => ({ href, dirty: true, text: 'hello hello hello', editor: { revealSearchMatch } }), navigateToFile: async () => true }
  const state = { view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  const rows = [...container.querySelectorAll('.mdp-workspace-search__match')]
  const input = container.querySelector('.mdp-workspace-search input')
  await act(async () => press(input, 'ArrowDown'))
  expect(document.activeElement).toBe(rows[0])
  await act(async () => press(document.activeElement, 'ArrowDown'))
  expect(document.activeElement).toBe(rows[1])
  expect(revealSearchMatch).not.toHaveBeenCalled()
  await act(async () => press(document.activeElement, 'F4'))
  expect(document.activeElement).toBe(rows[2])
  expect(revealSearchMatch).toHaveBeenLastCalledWith(12, 17, { preserveFocus: true })
  await act(async () => press(document.activeElement, 'F4', { shiftKey: true }))
  expect(document.activeElement).toBe(rows[1])
  expect(revealSearchMatch).toHaveBeenLastCalledWith(6, 11, { preserveFocus: true })
  expect(model.find.open).toBe(false)
  container.querySelector('details').open = false
  await act(async () => press(input, 'ArrowDown'))
  expect(document.activeElement).toBe(rows[1])
})

it('suspends workspace search during IME composition, including Enter, then debounces the committed text', async () => {
  const href = 'file:///notes/a.md'
  const getSearchDocument = vi.fn(() => ({ href, dirty: true, text: 'hello hai hải' }))
  const state = { view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge: { getSearchDocument } })))
  await act(async () => model.openWorkspace('hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  const input = container.querySelector('.mdp-workspace-search input')
  const row = container.querySelector('.mdp-workspace-search__match')
  getSearchDocument.mockClear()
  await act(async () => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => model.setWorkspaceQuery('hai'))
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  await act(async () => press(input, 'Enter'))
  expect(getSearchDocument).not.toHaveBeenCalled()
  expect(container.querySelector('.mdp-workspace-search__match')).toBe(row)
  expect(row.disabled).toBe(true)
  await act(async () => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'hai' })))
  await act(async () => vi.advanceTimersByTimeAsync(249))
  expect(getSearchDocument).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTimeAsync(11))
  expect(getSearchDocument).toHaveBeenCalledTimes(1)
  expect(container.querySelector('.mdp-workspace-search mark').textContent).toBe('hai')
})

it('does not recompute or navigate document matches while composing', async () => {
  await act(async () => root.render(React.createElement(Harness)))
  await act(async () => model.openFind('hello'))
  await act(async () => vi.advanceTimersByTime(110))
  const input = container.querySelector('.mdp-find input')
  await act(async () => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => model.setFindQuery('missing'))
  await act(async () => vi.advanceTimersByTime(1000))
  await act(async () => press(input, 'Enter'))
  expect(container.querySelector('.mdp-find__count').textContent).toBe('…')
  await act(async () => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })))
  await act(async () => vi.advanceTimersByTime(110))
  expect(container.querySelector('.mdp-find__count').textContent).toBe('0/0')
})

it('reuses the rendered-text index until document nodes change and blocks old-match navigation while pending', async () => {
  await act(async () => root.render(React.createElement(Harness)))
  const walk = vi.spyOn(document, 'createTreeWalker')
  await act(async () => model.openFind('hello'))
  await act(async () => vi.advanceTimersByTime(110))
  expect(walk).toHaveBeenCalledTimes(1)
  await act(async () => model.setFindQuery('world'))
  expect(container.querySelector('.mdp-find [aria-label="Next match (Enter)"]').disabled).toBe(true)
  await act(async () => vi.advanceTimersByTime(110))
  expect(walk).toHaveBeenCalledTimes(1)
  expect(container.querySelector('.mdp-find__count').textContent).toBe('0/0')
  await act(async () => { container.querySelector('article p').firstChild.nodeValue = 'world ' })
  await act(async () => vi.advanceTimersByTime(110))
  expect(walk).toHaveBeenCalledTimes(2)
  expect(container.querySelector('.mdp-find__count').textContent).toBe('1/1')
  walk.mockRestore()
})

it('uses warm workspace source across query changes and bypasses it for Search again', async () => {
  const href = 'file:///notes/a.md'
  const text = vi.fn(async () => 'hello help')
  const reader = { text }
  const bridge = { getWorkspaceReader: () => reader, getSearchDocument: () => ({ href, text: 'hello help' }) }
  const state = { view: 'tree', tree: { type: 'folder', children: [{ type: 'file', name: 'a.md', href }] } }
  await act(async () => root.render(React.createElement(Harness, { state, bridge })))
  await act(async () => model.openWorkspace('hello'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  await act(async () => model.setWorkspaceQuery('hel'))
  await act(async () => vi.advanceTimersByTimeAsync(260))
  expect(text).toHaveBeenCalledTimes(1)
  expect(container.querySelectorAll('.mdp-workspace-search__match')).toHaveLength(2)
  expect(container.textContent).toContain('Includes cached file contents')
  await act(async () => container.querySelector('.mdp-workspace-search [aria-label="Search again"]').click())
  await act(async () => vi.advanceTimersByTimeAsync(10))
  expect(text).toHaveBeenCalledTimes(2)
})
