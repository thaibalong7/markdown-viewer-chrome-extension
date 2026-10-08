export const DIFF_LIMITS = Object.freeze({ maxSourceLength: 512 * 1024, maxLines: 20000, maxWork: 1000000, maxMs: 80, maxOutputRows: 2000 })

function splitLines(source) {
  if (!source) return []
  return source.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) || []
}

/** Bounded Myers line diff. Raw lines retain line-ending and final-newline differences. */
export function diffLines(before, after, options = {}) {
  const limits = { ...DIFF_LIMITS, ...options }
  const now = options.now || (() => performance.now())
  const started = now()
  let work = 0
  const withinBudget = () => ++work <= limits.maxWork && now() - started <= limits.maxMs
  const fallback = (reason) => ({ limited: true, reason, rows: [], added: null, removed: null })
  if (before.length > limits.maxSourceLength || after.length > limits.maxSourceLength) return fallback('source-size')
  const a = splitLines(before)
  const b = splitLines(after)
  if (a.length > limits.maxLines || b.length > limits.maxLines) return fallback('line-count')
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  let suffix = 0
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++
  const n = a.length - prefix - suffix
  const m = b.length - prefix - suffix
  let operations = []
  if (!n || !m) {
    operations = [...Array(n).fill('removed'), ...Array(m).fill('added')]
  } else {
    const trace = []
    const frontier = new Map([[1, 0]])
    let found = false
    for (let d = 0; d <= n + m && !found; d++) {
      trace.push(new Map(frontier))
      for (let k = -d; k <= d; k += 2) {
        if (!withinBudget()) return fallback('computation')
        let x = k === -d || (k !== d && (frontier.get(k - 1) ?? -Infinity) < (frontier.get(k + 1) ?? -Infinity))
          ? (frontier.get(k + 1) || 0) : (frontier.get(k - 1) || 0) + 1
        let y = x - k
        while (x < n && y < m && a[prefix + x] === b[prefix + y]) {
          if (!withinBudget()) return fallback('computation')
          x++; y++
        }
        frontier.set(k, x)
        if (x < n || y < m) continue
        for (let depth = d; depth >= 0; depth--) {
          const v = trace[depth]
          const diagonal = x - y
          const previousK = diagonal === -depth || (diagonal !== depth && (v.get(diagonal - 1) ?? -Infinity) < (v.get(diagonal + 1) ?? -Infinity))
            ? diagonal + 1 : diagonal - 1
          const previousX = v.get(previousK) || 0
          const previousY = previousX - previousK
          while (x > previousX && y > previousY) { operations.push('equal'); x--; y-- }
          if (depth === 0) break
          if (x === previousX) { operations.push('added'); y-- } else { operations.push('removed'); x-- }
        }
        operations.reverse()
        found = true
        break
      }
    }
  }
  operations = [...Array(prefix).fill('equal'), ...operations, ...Array(suffix).fill('equal')]
  let oldIndex = 0
  let newIndex = 0
  let added = 0
  let removed = 0
  const rows = operations.map((type) => {
    const raw = type === 'added' ? b[newIndex] : a[oldIndex]
    const oldLine = type === 'added' ? null : ++oldIndex
    const newLine = type === 'removed' ? null : ++newIndex
    if (type === 'added') added++
    if (type === 'removed') removed++
    return { type, oldLine, newLine, text: raw.replace(/(?:\r\n|\r|\n)$/, ''), ending: raw.endsWith('\r\n') ? 'CRLF' : raw.endsWith('\n') ? 'LF' : raw.endsWith('\r') ? 'CR' : 'No newline at end of file' }
  })
  if (now() - started > limits.maxMs) return fallback('computation')
  return { limited: false, rows, added, removed }
}

export function groupDiffHunks(rows, maxOutputRows = DIFF_LIMITS.maxOutputRows) {
  const ranges = []
  rows.forEach((row, index) => {
    if (row.type === 'equal') return
    const start = Math.max(0, index - 3)
    const end = Math.min(rows.length, index + 4)
    const last = ranges.at(-1)
    if (last && start <= last.end) last.end = end
    else ranges.push({ start, end })
  })
  if (ranges.reduce((count, range) => count + range.end - range.start, 0) > maxOutputRows) return null
  return ranges.map(({ start, end }, index) => ({ id: index, rows: rows.slice(start, end) }))
}
