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

export function renderToc(tocContainerEl, tocItems) {
  tocContainerEl.innerHTML = ''

  const linkById = new Map()
  const list = document.createElement('ul')
  list.className = 'mdp-toc__list'

  if (!tocItems?.length) {
    const empty = document.createElement('div')
    empty.className = 'mdp-toc__empty'
    empty.textContent = 'No headings found.'
    tocContainerEl.appendChild(empty)
    return { linkById }
  }

  for (const item of tocItems) {
    const li = document.createElement('li')
    li.className = 'mdp-toc__item'

    const link = document.createElement('a')
    link.href = `#${item.id}`
    link.textContent = item.text
    link.className = `mdp-toc__link mdp-toc__link--h${item.level}`
    link.dataset.mdpTocId = item.id

    li.appendChild(link)
    list.appendChild(li)

    linkById.set(item.id, link)
  }

  tocContainerEl.appendChild(list)
  return { linkById }
}

