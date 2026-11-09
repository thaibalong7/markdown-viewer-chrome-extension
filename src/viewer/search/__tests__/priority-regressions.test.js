// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createExplorerNavigator } from '../../explorer/explorer-navigation.js'
import { collectDocumentText, findDocumentRanges } from '../document-find.js'
import { searchText, MAX_SEARCH_TEXT } from '../text-search.js'
import { openWorkspaceSearchResult } from '../result-navigation.js'

afterEach(() => document.body.replaceChildren())

function fixture(source = 'needle') {
  const article = document.createElement('article'); article.textContent = source
  const row = document.createElement('button'); document.body.append(row, article); row.focus()
  const href = 'file:///notes/a.md'
  let loaded = source
  const bridge = { getArticleEl: () => article, getSearchDocument: () => ({ href, text: loaded }) }
  const openDocument = vi.fn(async () => { loaded = 'changed needle'; article.textContent = loaded; return true })
  bridge.openDocument = openDocument
  const navigator = createExplorerNavigator({ bridge, refs: { currentFileUrlRef: { current: href }, explorerModeRef: { current: 'workspace' } }, setCurrentFileUrl() {} })
  bridge.navigateToFile = navigator.navigateToFile
  return { article, row, href, bridge, openDocument }
}

it('preserves list focus with the real same-file navigator, not a stubbed bridge', async () => {
  const { article, row, href, bridge } = fixture()
  const result = await openWorkspaceSearchResult({ bridge, group: { href }, query: 'needle', match: searchText('needle', 'needle').matches[0] })
  expect(result.range.toString()).toBe('needle')
  expect(document.activeElement).toBe(row)
  await bridge.navigateToFile(href)
  expect(document.activeElement).toBe(article)
})

it('refreshes an out-of-date displayed document through the real guarded navigator', async () => {
  const { row, href, bridge, openDocument } = fixture()
  const result = await openWorkspaceSearchResult({ bridge, group: { href }, query: 'needle', match: searchText('changed needle', 'needle').matches[0] })
  expect(result.range.toString()).toBe('needle')
  expect(openDocument).toHaveBeenCalledWith(href, { forceReload: true })
  expect(document.activeElement).toBe(row)
})

it('does not reload a dirty draft or bypass a rejected document refresh', async () => {
  const { href, bridge, openDocument } = fixture()
  const match = searchText('changed needle', 'needle').matches[0]
  bridge.getSearchDocument = () => ({ href, text: 'needle', dirty: true })
  expect(await openWorkspaceSearchResult({ bridge, group: { href }, query: 'needle', match })).toEqual({ stale: true })
  expect(openDocument).not.toHaveBeenCalled()
  bridge.getSearchDocument = () => ({ href, text: 'needle', dirty: false })
  openDocument.mockResolvedValue(false)
  expect(await openWorkspaceSearchResult({ bridge, group: { href }, query: 'needle', match })).toBeNull()
})

it('never crosses the text-index cap or creates negative chunks at a block/BR boundary', () => {
  for (const separator of ['br', 'p']) {
    const article = document.createElement('article'); document.body.append(article)
    article.append(document.createTextNode('x'.repeat(MAX_SEARCH_TEXT)), document.createElement(separator), document.createTextNode('needle'.repeat(500)))
    const index = collectDocumentText(article)
    expect(index.text.length).toBeLessThanOrEqual(MAX_SEARCH_TEXT)
    expect(index.limited).toBe(true)
    expect(index.chunks.every(chunk => chunk.from <= chunk.to && chunk.to <= MAX_SEARCH_TEXT)).toBe(true)
    expect(findDocumentRanges(article, 'needle').ranges).toEqual([])
  }
})

it('does not activate cached hits that no longer exist on disk', async () => {
  const { href, bridge, openDocument } = fixture()
  const result = await openWorkspaceSearchResult({ bridge, group: { href }, query: 'needle', match: searchText('needle', 'needle').matches[0], readSource: async () => 'removed' })
  expect(result).toEqual({ stale: true })
  expect(openDocument).not.toHaveBeenCalled()
})
