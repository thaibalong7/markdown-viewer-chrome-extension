const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'
const DEFAULT_LEVELS = [1, 2, 3, 4, 5, 6]

function normalizeHeadingText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildTocItems(articleEl, { levels = DEFAULT_LEVELS } = {}) {
  if (!articleEl) return []

  const headings = Array.from(articleEl.querySelectorAll(HEADING_SELECTOR))
  const items = []

  for (const headingEl of headings) {
    const level = Number(headingEl.tagName?.slice(1) || 0)
    if (!levels.includes(level)) continue

    const id = String(headingEl.id || '')
    if (!id) continue

    const text = normalizeHeadingText(headingEl.textContent)
    if (!text) continue

    items.push({
      id,
      level,
      text,
      el: headingEl
    })
  }

  return items
}
