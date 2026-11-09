// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ExplorerPanel } from '../ExplorerPanel.jsx'
import { SearchProvider, useSearch } from '../../../contexts/SearchContext.jsx'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { createInitialState } from '../../../hooks/explorer/explorerReducer.js'

const fixture = vi.hoisted(() => ({ state: null }))
vi.mock('../../../hooks/useExplorer.js', () => ({ useExplorer: () => ({ state: fixture.state, actions: {} }) }))
vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: () => ({ getVirtualItems: () => [], getTotalSize: () => 2000, measure() {}, scrollToIndex() {} }) }))
let root
let model
function Model() { model = useSearch(); return null }
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals() })

it('retains Files headers, toolbar, tree DOM and scroll offset while toggling only the tree area', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0))
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  fixture.state = { ...createInitialState(), view: 'tree', explorerMode: 'sibling', actionsMode: 'sibling',
    summaryDirectoryLabel: '/notes', summaryFileCount: 1, tree: { type: 'folder', name: 'notes', href: 'file:///notes/', children: [] } }
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => root.render(React.createElement(ToastProvider, null, React.createElement(SearchProvider, null, React.createElement(Model), React.createElement(ExplorerPanel, { expanded: true })))))
  const header = container.querySelector('.mdp-explorer__header')
  const toolbar = container.querySelector('.mdp-explorer__toolbar')
  const tree = container.querySelector('.mdp-explorer__scroll-region')
  tree.scrollTop = 260
  const headerMarkup = header.innerHTML
  const toggle = toolbar.querySelector('[aria-controls="mdp-explorer-search"]')
  toggle.focus()
  await act(async () => toggle.click())
  expect(model.workspace.open).toBe(true)
  expect(container.querySelector('.mdp-explorer__header')).toBe(header)
  expect(header.innerHTML).toBe(headerMarkup)
  expect(container.querySelector('.mdp-explorer__toolbar')).toBe(toolbar)
  expect(container.querySelector('.mdp-explorer__scroll-region')).toBe(tree)
  expect(tree.scrollTop).toBe(260)
  expect(tree.hasAttribute('inert')).toBe(true)
  expect(toggle.getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelector('.mdp-workspace-search__tabs')).toBeNull()
  await act(async () => container.querySelector('.mdp-workspace-search__query-row > button').click())
  expect(model.workspace.open).toBe(false)
  expect(tree.scrollTop).toBe(260)
  expect(tree.hasAttribute('inert')).toBe(false)
  expect(document.activeElement).toBe(toggle)
})
