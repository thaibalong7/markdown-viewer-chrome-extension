// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchText } from '../text-search.js'
import { collectDocumentText, findDocumentRanges, paintFindRanges } from '../document-find.js'
import { searchWorkspace, workspaceSearchFiles } from '../workspace-search.js'
import { openWorkspaceSearchResult, renderedResultRange } from '../result-navigation.js'
import { getSearchShortcut } from '../search-shortcuts.js'

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals() })
function article(html) {
  const node = document.createElement('article')
  node.innerHTML = html
  document.body.append(node)
  return node
}

describe('literal source search', () => {
  it('escapes regex syntax and keeps Unicode/CRLF offsets, lines and columns exact', () => {
    const text = 'Đường dẫn\r\nİ [a+b] 😀\r\n[a+B]'
    const result = searchText(text, '[a+b]')
    expect(result.matches.map(({ line, column, from, to }) => ({ line, column, text: text.slice(from, to) }))).toEqual([
      { line: 2, column: 3, text: '[a+b]' }, { line: 3, column: 1, text: '[a+B]' }
    ])
    expect(searchText('界界', '界', 1).limited).toBe(true)
    expect(searchText('abc', '').matches).toEqual([])
    const long = searchText('a'.repeat(10000) + 'needle', 'needle').matches[0]
    expect(long.snippet.length).toBeLessThan(180)
    expect(long.prefix).toBe(true)
    expect(long.snippetFrom).toBeLessThanOrEqual(12)
    expect(long.snippet.slice(long.snippetFrom, long.snippetTo)).toBe('needle')
  })
})

describe('read-only document Find', () => {
  it('finds across inline syntax spans while excluding chrome, hidden and separate blocks', () => {
    const node = article('<p>hel<strong>lo</strong> world<button>hello</button></p><p>hel</p><p>lo</p><div hidden>hello</div><div style="display:none">hello</div><svg><text>hello</text></svg><div class="mdp-ui-state">hello</div><pre><code><span>hel</span><span>lo</span></code></pre>')
    const before = node.innerHTML
    const code = node.querySelector('code')
    const { ranges } = findDocumentRanges(node, 'hello')
    expect(ranges.map((range) => range.toString())).toEqual(['hello', 'hello'])
    expect(node.innerHTML).toBe(before)
    expect(node.querySelector('code')).toBe(code)
    expect(collectDocumentText(node).text).not.toContain('hellohello')
  })
  it('registers distinct current/all highlights and releases both on cleanup', () => {
    const highlights = new Map()
    vi.stubGlobal('CSS', { highlights })
    vi.stubGlobal('Highlight', class { constructor(...ranges) { this.ranges = ranges } })
    const node = article('<p>hello hello</p>')
    const { ranges } = findDocumentRanges(node, 'hello')
    const cleanup = paintFindRanges(node, ranges, 1)
    expect(highlights.get('mdp-find').ranges).toHaveLength(2)
    expect(highlights.get('mdp-find-current').ranges).toEqual([ranges[1]])
    cleanup()
    expect(highlights.size).toBe(0)
  })
  it('respects closed details and line breaks without discarding the beginning of a large text node', () => {
    const node = article('<div>foo</div><div>bar</div><p>foo<br>bar</p><details><summary>Summary</summary><p>hidden needle</p></details>')
    expect(findDocumentRanges(node, 'foobar').ranges).toHaveLength(0)
    expect(findDocumentRanges(node, '\nbar').ranges).toHaveLength(0)
    expect(findDocumentRanges(node, 'needle').ranges).toHaveLength(0)
    expect(findDocumentRanges(node, 'Summary').ranges).toHaveLength(1)
    node.querySelector('details').open = true
    expect(findDocumentRanges(node, 'needle').ranges).toHaveLength(1)
    node.textContent = 'needle ' + 'x'.repeat(2 * 1024 * 1024)
    expect(findDocumentRanges(node, 'needle')).toMatchObject({ limited: true, ranges: [expect.any(Range)] })
  })
})

describe('workspace I/O and boundaries', () => {
  const files = ['one.md', 'two.txt', 'three.sql'].map((name) => ({ href: `file:///workspace/${name}`, path: name }))
  it('walks collapsed folders and excludes images using the file registry', () => {
    const tree = { type: 'folder', name: 'root', children: [
      { type: 'folder', name: 'docs', children: [{ type: 'file', name: 'one.md', href: files[0].href }] },
      { type: 'file', name: 'logo.svg', href: 'file:///workspace/logo.svg' }
    ] }
    expect(workspaceSearchFiles(tree)).toEqual([{ href: files[0].href, path: 'docs/one.md' }])
  })
  it('searches the existing sibling fallback list without selecting another workspace', () => {
    expect(workspaceSearchFiles(null, [
      { href: files[0].href, displayName: 'one.md' },
      { href: 'file:///workspace/photo.png', displayName: 'photo.png' }
    ])).toEqual([{ href: files[0].href, path: 'one.md' }])
  })
  it('uses the active unsaved draft, virtual readers and explicit failed-read counts', async () => {
    const reader = { text: async () => 'needle' }
    const readDocument = vi.fn(async ({ href, workspaceReader }) => {
      if (href === files[2].href) throw new Error('denied')
      expect(workspaceReader).toBe(reader)
      return { text: 'needle in file' }
    })
    const result = await searchWorkspace({ files, query: 'needle', readDocument, getReader: () => reader,
      getCurrentDocument: () => ({ href: files[0].href, dirty: true, text: 'new needle draft' }) })
    expect(readDocument).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ count: 2, scanned: 3, skipped: 1 })
    expect(result.groups[0]).toMatchObject({ dirty: true })
    expect(result.groups[0].matches[0].snippet).toBe('new needle draft')
  })
  it('discards a late read after cancellation and marks bounded results incomplete', async () => {
    const controller = new AbortController()
    let resolve
    const task = searchWorkspace({ files, query: 'needle', signal: controller.signal, readDocument: () => new Promise((done) => { resolve = done }) })
    controller.abort()
    resolve({ text: 'needle' })
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
    const result = await searchWorkspace({ files, query: 'needle', maxMatches: 1, readDocument: async () => ({ text: 'needle' }) })
    expect(result).toMatchObject({ count: 1, scanned: 1, limited: true })
  })
})

describe('exact result navigation', () => {
  it('maps repeated visible occurrences within their Markdown source block', () => {
    const source = '# Hello\n\nHello **hello**\n\nlast'
    const node = article('<h1 data-line="0">Hello</h1><p data-line="2">Hello <strong>hello</strong></p><p data-line="4">last</p>')
    const match = searchText(source, 'hello').matches[2]
    const range = renderedResultRange(node, source, 'hello', match)
    expect(range.toString()).toBe('hello')
    expect(range.startContainer.parentElement.tagName).toBe('STRONG')
  })
  it('falls back to source for hidden link destinations instead of selecting another visible match', () => {
    const source = '[needle](https://needle.example)'
    const node = article('<p data-line="0"><a>needle</a></p>')
    expect(renderedResultRange(node, source, 'needle', searchText(source, 'needle').matches[1])).toBeNull()
  })
  it('honors rejected dirty navigation, stale query guards and changed file offsets', async () => {
    const source = 'hello'
    const group = { href: 'file:///workspace/one.md', path: 'one.md' }
    const match = searchText(source, 'hello').matches[0]
    const getSearchDocument = vi.fn(() => ({ href: group.href, text: 'changed hello' }))
    expect(await openWorkspaceSearchResult({ group, match, query: 'hello', bridge: { navigateToFile: async () => false, getSearchDocument } })).toBeNull()
    expect(getSearchDocument).not.toHaveBeenCalled()
    expect(await openWorkspaceSearchResult({ group, match, query: 'hello', isCurrent: () => false, bridge: { navigateToFile: async () => true, getSearchDocument } })).toBeNull()
    expect(await openWorkspaceSearchResult({ group, match, query: 'hello', bridge: { navigateToFile: async () => true, getSearchDocument } })).toEqual({ stale: true })
  })
  it('reveals a draft result directly in the editor without changing its text', async () => {
    const source = 'draft needle'
    const match = searchText(source, 'needle').matches[0]
    const revealSearchMatch = vi.fn()
    const group = { href: 'file:///workspace/draft.md' }
    expect(await openWorkspaceSearchResult({ group, match, query: 'needle', bridge: {
      navigateToFile: async () => true, getSearchDocument: () => ({ href: group.href, text: source, editor: { revealSearchMatch } })
    } })).toEqual({ editor: true })
    expect(revealSearchMatch).toHaveBeenCalledWith(6, 12, { preserveFocus: true })
  })
})

it('reserves exact shortcut combinations and leaves editor/browser alternatives available', () => {
  expect(getSearchShortcut({ key: 'f', ctrlKey: true })).toBe('document')
  expect(getSearchShortcut({ key: 'F', metaKey: true })).toBe('document')
  expect(getSearchShortcut({ key: 'F', ctrlKey: true, shiftKey: true })).toBe('workspace')
  expect(getSearchShortcut({ key: 'F', metaKey: true, shiftKey: true })).toBeNull()
  expect(getSearchShortcut({ key: 'f', ctrlKey: true, altKey: true })).toBeNull()
  expect(getSearchShortcut({ key: 'f', ctrlKey: true, isComposing: true })).toBeNull()
})
