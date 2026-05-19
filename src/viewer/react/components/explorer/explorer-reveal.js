const DEFAULT_REVEAL_TOP_GAP = 32
const DEFAULT_REVEAL_BOTTOM_GAP = 32
const DEFAULT_VISIBILITY_TOP_GAP = 4
const DEFAULT_VISIBILITY_BOTTOM_GAP = 4

function rectNumber(rect, key) {
  const value = Number(rect?.[key])
  return Number.isFinite(value) ? value : 0
}

export function getExplorerRevealScrollDelta({
  rowRect,
  scrollRect,
  stickyHeaderRect,
  topGap = DEFAULT_REVEAL_TOP_GAP,
  bottomGap = DEFAULT_REVEAL_BOTTOM_GAP
}) {
  const rowTop = rectNumber(rowRect, 'top')
  const rowBottom = rectNumber(rowRect, 'bottom')
  const scrollTop = rectNumber(scrollRect, 'top')
  const scrollBottom = rectNumber(scrollRect, 'bottom')
  const stickyBottom = rectNumber(stickyHeaderRect, 'bottom')

  if (rowBottom <= rowTop || scrollBottom <= scrollTop) return 0

  const safeTop = Math.max(scrollTop, stickyBottom) + topGap
  const safeBottom = scrollBottom - bottomGap

  if (rowTop < safeTop) return rowTop - safeTop
  if (rowBottom > safeBottom) return rowBottom - safeBottom
  return 0
}

function getActiveExplorerRowElements({ panelEl, scrollEl }) {
  if (!(panelEl instanceof HTMLElement) || !(scrollEl instanceof HTMLElement)) return null

  const rowEl = panelEl.querySelector('.mdp-explorer__node-btn.is-active')
  if (!(rowEl instanceof HTMLElement)) return null

  const headerEl = panelEl.querySelector('.mdp-explorer__header')
  return { rowEl, headerEl }
}

export function getActiveExplorerRowRevealState({ panelEl, scrollEl }) {
  const elements = getActiveExplorerRowElements({ panelEl, scrollEl })
  if (!elements) return 'missing'

  const delta = getExplorerRevealScrollDelta({
    rowRect: elements.rowEl.getBoundingClientRect(),
    scrollRect: scrollEl.getBoundingClientRect(),
    stickyHeaderRect: elements.headerEl?.getBoundingClientRect?.(),
    topGap: DEFAULT_VISIBILITY_TOP_GAP,
    bottomGap: DEFAULT_VISIBILITY_BOTTOM_GAP
  })

  return delta === 0 ? 'visible' : 'hidden'
}

export function revealActiveExplorerRow({ panelEl, scrollEl }) {
  const elements = getActiveExplorerRowElements({ panelEl, scrollEl })
  if (!elements) return

  const delta = getExplorerRevealScrollDelta({
    rowRect: elements.rowEl.getBoundingClientRect(),
    scrollRect: scrollEl.getBoundingClientRect(),
    stickyHeaderRect: elements.headerEl?.getBoundingClientRect?.()
  })

  if (delta === 0) return
  scrollEl.scrollBy({ top: delta, behavior: 'auto' })
}
