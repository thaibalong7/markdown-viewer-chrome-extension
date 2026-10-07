import { createMarkdownEngine } from '../core/markdown-engine.js'
import { DIFF_LIMITS, diffLines, groupDiffHunks } from './line-diff.js'

function headingsFromSource(engine, source) {
  const tokens = engine.parse(source, {})
  return tokens.flatMap((token, index) => token.type === 'heading_open' && token.map ? [{
    start: token.map[0] + 1,
    end: token.map[1],
    title: tokens[index + 1].children?.filter((child) => ['text', 'code_inline', 'image'].includes(child.type)).map((child) => child.content).join('') || tokens[index + 1].content,
    level: token.tag
  }] : [])
}

function ownerAt(headings, line) {
  let low = 0
  let high = headings.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (headings[mid].start <= line) low = mid + 1
    else high = mid
  }
  return headings[low - 1] || null
}

export function buildChangeReview(before, after, limits = {}) {
  const now = limits.now || (() => performance.now())
  const started = now()
  const timedOut = () => now() - started > (limits.maxMs ?? DIFF_LIMITS.maxMs)
  const computationFallback = (result) => ({ limited: true, reason: 'computation', hunks: [], sections: [], added: result.added, removed: result.removed })
  const result = diffLines(before, after, limits)
  if (result.limited) return { ...result, hunks: [], sections: [] }
  if (!result.added && !result.removed) return { added: 0, removed: 0, limited: false, hunks: [], sections: [] }
  const hunks = groupDiffHunks(result.rows, limits.maxOutputRows)
  if (!hunks) return { ...result, rows: [], limited: true, reason: 'output-size', hunks: [], sections: [] }
  const engine = createMarkdownEngine().instance
  const oldHeadings = headingsFromSource(engine, before)
  const newHeadings = headingsFromSource(engine, after)
  if (timedOut()) return computationFallback(result)
  const equalLines = new Map(result.rows.filter((row) => row.type === 'equal').map((row) => [row.oldLine, row.newLine]))
  const newByStart = new Map(newHeadings.map((heading) => [heading.start, heading]))
  const mapped = new Map(oldHeadings.map((old) => {
    const next = newByStart.get(equalLines.get(old.start))
    const unchanged = next && next.title === old.title && next.level === old.level && next.end - next.start === old.end - old.start &&
      Array.from({ length: old.end - old.start + 1 }, (_, offset) => equalLines.get(old.start + offset) === next.start + offset).every(Boolean)
    return [old, unchanged ? next : null]
  }))
  const affected = new Map()
  for (const row of result.rows) {
    if (timedOut()) return computationFallback(result)
    if (row.type === 'equal') continue
    const old = row.type === 'removed' ? ownerAt(oldHeadings, row.oldLine) : null
    const next = row.type === 'added' ? ownerAt(newHeadings, row.newLine) : mapped.get(old)
    const heading = next || old
    const removed = Boolean(old && !next)
    const key = heading ? `${removed ? 'old' : 'new'}:${heading.start}` : 'preamble'
    if (!affected.has(key)) affected.set(key, {
      key, title: heading?.title || 'Before the first heading', removed,
      newLine: next?.start ?? null,
      hunk: hunks.findIndex((hunk) => hunk.rows.includes(row))
    })
  }
  return { added: result.added, removed: result.removed, limited: false, hunks, sections: [...affected.values()] }
}
