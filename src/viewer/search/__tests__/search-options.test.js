// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { searchText } from '../text-search.js'
import { findDocumentRanges } from '../document-find.js'
import { renderedResultRange, openWorkspaceSearchResult } from '../result-navigation.js'
import { searchWorkspace } from '../workspace-search.js'

afterEach(() => document.body.replaceChildren())
const hits = (text, query, options) => searchText(text, query, undefined, options).matches

it('combines case, Unicode whole-word and diacritic matching without changing default behavior', () => {
  const source = 'hải Hải phải HẢI hai HAI khai hải_1 hải2'
  expect(hits(source, 'hải')).toHaveLength(6)
  expect(hits(source, 'hải', { caseSensitive: true })).toHaveLength(4)
  expect(hits(source, 'hải', { wholeWord: true }).map(m => m.text)).toEqual(['hải', 'Hải', 'HẢI'])
  expect(hits(source, 'hai', { wholeWord: true, diacriticSensitive: false }).map(m => m.text)).toEqual(['hải', 'Hải', 'HẢI', 'hai', 'HAI'])
  expect(hits(source, 'hai', { wholeWord: true, diacriticSensitive: false, caseSensitive: true }).map(m => m.text)).toEqual(['hải', 'hai'])
  expect(hits('đường ĐƯỜNG duong', 'duong', { diacriticSensitive: false }).map(m => m.text)).toEqual(['đường', 'ĐƯỜNG', 'duong'])
  expect(hits('é e', '\u0301', { diacriticSensitive: false })).toEqual([])
  expect(hits('a á ả ấ a\u0309', 'a').map(m => m.text)).toEqual(['a'])
})

it('uses Unicode word boundaries including astral letters, marks, numbers and identifiers', () => {
  expect(hits('hải, (hải) hải界 界hải 𐐀hải hải𐐀 _hải hải_ hải2', 'hải', { wholeWord: true }).map(m => m.text)).toEqual(['hải', 'hải'])
  expect(hits('a+b aab', 'a+b', { wholeWord: true })).toHaveLength(1)
})

it('keeps original graphemes, UTF-16 offsets and CRLF locations for decomposed Vietnamese', () => {
  const decomposed = 'ha\u0309i'
  const source = `😀\r\n${decomposed} Đường hải`
  const found = hits(source, 'hai', { diacriticSensitive: false, wholeWord: true })
  expect(found.map(m => ({ from: m.from, to: m.to, line: m.line, column: m.column, text: m.text }))).toEqual([
    { from: 4, to: 8, line: 2, column: 1, text: decomposed },
    { from: 18, to: 21, line: 2, column: 15, text: 'hải' }
  ])
  for (const match of found) {
    expect(source.slice(match.from, match.to)).toBe(match.text)
    expect(match.snippet.slice(match.snippetFrom, match.snippetTo)).toBe(match.text)
  }
  expect(hits(source, 'hải').map(m => m.text)).toEqual([decomposed, 'hải'])
  expect(hits('한 한', '한').map(m => m.text)).toEqual(['한', '한'])
})

it('maps folded visible matches across inline spans and activates the same workspace occurrence', async () => {
  const source = 'phải hải Hải'
  const article = document.createElement('article')
  article.innerHTML = '<p data-line="0">phải h<strong>ải</strong> Hải</p>'
  document.body.append(article)
  const options = { wholeWord: true, diacriticSensitive: false, caseSensitive: true }
  const match = hits(source, 'hai', options)[0]
  expect(findDocumentRanges(article, 'hai', options).ranges.map(r => r.toString())).toEqual(['hải'])
  expect(renderedResultRange(article, source, 'hai', match, options).toString()).toBe('hải')
  const group = { href: 'file:///notes/one.md', path: 'one.md' }
  const opened = await openWorkspaceSearchResult({ group, match, query: 'hai', options, bridge: {
    navigateToFile: async () => true,
    getSearchDocument: () => ({ href: group.href, text: source }),
    getArticleEl: () => article
  } })
  expect(opened.rendered).toBe(true)
  expect(opened.range.toString()).toBe('hải')
  const result = await searchWorkspace({ files: [group], query: 'hai', options, readDocument: async () => ({ text: source }) })
  expect(result.count).toBe(1)
  expect(result.groups[0].matches[0]).toEqual(match)
})
