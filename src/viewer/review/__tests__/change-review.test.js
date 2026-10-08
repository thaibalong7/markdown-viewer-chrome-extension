import { describe, expect, it, vi } from 'vitest'
import { diffLines, groupDiffHunks } from '../line-diff.js'
import { buildChangeReview } from '../change-review.js'
import { navigateReviewSection } from '../review-navigation.js'

describe('bounded source diff', () => {
  it.each([
    ['', 'a\n', 1, 0], ['a\n', '', 0, 1], ['a\nb\n', 'a\nc\n', 1, 1],
    ['a\n', 'a', 1, 1], ['a\r\n', 'a\n', 1, 1], ['a\rb\r', 'a\rc\r', 1, 1], ['Tiếng Việt 😀\n', 'Tiếng Việt 🐱\n', 1, 1],
    ['', '', 0, 0], ['same', 'same', 0, 0], ['a\na\n', 'a\n', 0, 1]
  ])('compares %j → %j with correct counts', (before, after, added, removed) => {
    const result = diffLines(before, after)
    expect(result).toMatchObject({ limited: false, added, removed })
    const reconstruct = (side) => result.rows.filter((row) => row.type !== (side === 'old' ? 'added' : 'removed')).map((row) => row.text + (row.ending === 'LF' ? '\n' : row.ending === 'CRLF' ? '\r\n' : row.ending === 'CR' ? '\r' : '')).join('')
    expect(reconstruct('old')).toBe(before)
    expect(reconstruct('new')).toBe(after)
    expect(result.rows.filter((row) => row.oldLine !== null).map((row) => row.oldLine)).toEqual(Array.from({ length: result.rows.filter((row) => row.oldLine !== null).length }, (_, i) => i + 1))
  })

  it('reconstructs both sides of repeated, interleaved changes with a minimal edit count', () => {
    // Deterministic exhaustive small inputs, independently checked with LCS.
    const sequences = ['']
    for (let length = 1; length <= 4; length++) {
      for (let bits = 0; bits < 2 ** length; bits++) sequences.push(Array.from({ length }, (_, i) => bits & 1 << i ? 'a\n' : 'b\n').join(''))
    }
    for (const before of sequences) for (const after of sequences) {
      const a = before.trimEnd().split('\n').filter(Boolean)
      const b = after.trimEnd().split('\n').filter(Boolean)
      const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
      const result = diffLines(before, after)
      expect(result.added + result.removed).toBe(a.length + b.length - 2 * dp[a.length][b.length])
      expect(result.rows.filter((r) => r.type !== 'added').map((r) => r.text + '\n').join('')).toBe(before)
      expect(result.rows.filter((r) => r.type !== 'removed').map((r) => r.text + '\n').join('')).toBe(after)
    }
  })

  it('bounds source size, line count, work, elapsed time and output separately', () => {
    expect(diffLines('aa', '', { maxSourceLength: 1 }).reason).toBe('source-size')
    expect(diffLines('a\nb\n', '', { maxLines: 1 }).reason).toBe('line-count')
    expect(diffLines('a\nb\n', 'c\nd\n', { maxWork: 1 }).reason).toBe('computation')
    let time = 0
    expect(diffLines('a\n', 'b\n', { now: () => time += 100, maxMs: 1 }).reason).toBe('computation')
    expect(buildChangeReview('a\n', 'b\n', { maxOutputRows: 1 })).toMatchObject({ limited: true, reason: 'output-size', added: 1, removed: 1 })
  })

  it('keeps separated change regions and bounds context', () => {
    const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n')
    const after = before.replace('line 2\n', 'changed 2\n').replace('line 25\n', 'changed 25\n')
    const hunks = groupDiffHunks(diffLines(before, after).rows)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].rows.some((r) => r.text === 'line 15')).toBe(false)
  })
})

describe('parser-based affected sections', () => {
  it('ignores heading-like text inside fenced and indented code', () => {
    const before = '# Real\n\n```md\n# Fake\nold\n```\n\n    # Indented\n'
    const review = buildChangeReview(before, before.replace('old', 'new').replace('Indented', 'changed'))
    expect(review.sections.map((s) => s.title)).toEqual(['Real'])
  })

  it('uses Setext source ranges and disambiguates duplicate headings by line', () => {
    const before = 'Same\n====\nold\n\n# Same\nother\n'
    const after = before.replace('other', 'new')
    const review = buildChangeReview(before, after)
    expect(review.sections).toEqual([expect.objectContaining({ title: 'Same', newLine: 5, removed: false })])
  })

  it('retains deleted section names without assigning a new navigation target', () => {
    const review = buildChangeReview('# Kept\na\n\n# Gone\nold\n', '# Kept\na\n')
    expect(review.sections.find((s) => s.title === 'Gone')).toMatchObject({ removed: true, newLine: null })
  })

  it('treats renamed headings as old and new sections and tracks insertions above surviving headings', () => {
    const review = buildChangeReview('# Old\na\n\n# Keep\nb\n', '# New\na\nextra\n\n# Keep\nc\n')
    expect(review.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Old', removed: true, newLine: null }),
      expect.objectContaining({ title: 'New', removed: false, newLine: 1 }),
      expect.objectContaining({ title: 'Keep', removed: false, newLine: 5 })
    ]))
  })

  it('handles empty files and changes before the first heading', () => {
    expect(buildChangeReview('', 'hello\n').sections[0].title).toBe('Before the first heading')
    expect(buildChangeReview('', '').hunks).toEqual([])
  })
})

it('navigates only existing headings in the current reviewed revision, never drafts, stale documents or deleted sections', () => {
  const pair = { generation: 1, after: '# Heading' }
  let target = { generation: 1, acceptedSource: '# Heading' }
  const heading = { getAttribute: () => '4', scrollIntoView: vi.fn() }
  const options = { session: { getWatchTarget: () => target }, pair, section: { newLine: 5, removed: false }, article: { querySelectorAll: () => [heading] } }
  expect(navigateReviewSection(options)).toBe(true)
  expect(heading.scrollIntoView).toHaveBeenCalledOnce()
  expect(navigateReviewSection({ ...options, editorProtected: true })).toBe(false)
  expect(navigateReviewSection({ ...options, section: { newLine: null, removed: true } })).toBe(false)
  expect(navigateReviewSection({ ...options, section: { newLine: 20 } })).toBe(false)
  target = { generation: 2, acceptedSource: '# Heading' }
  expect(navigateReviewSection(options)).toBe(false)
  target = { generation: 1, acceptedSource: '# Newer' }
  expect(navigateReviewSection(options)).toBe(false)
})
