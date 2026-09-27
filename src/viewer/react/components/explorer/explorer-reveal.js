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
  topGap = DEFAULT_REVEAL_TOP_GAP,
  bottomGap = DEFAULT_REVEAL_BOTTOM_GAP
}) {
  const rowTop = rectNumber(rowRect, 'top')
  const rowBottom = rectNumber(rowRect, 'bottom')
  const scrollTop = rectNumber(scrollRect, 'top')
  const scrollBottom = rectNumber(scrollRect, 'bottom')

  if (rowBottom <= rowTop || scrollBottom <= scrollTop) return 0

  const safeTop = scrollTop + topGap
  const safeBottom = scrollBottom - bottomGap

  if (rowTop < safeTop) return rowTop - safeTop
  if (rowBottom > safeBottom) return rowBottom - safeBottom
  return 0
}

function getActiveExplorerRow(scrollEl) {
  if (!(scrollEl instanceof HTMLElement)) return null
  const rowEl = scrollEl.querySelector('.mdp-explorer__node-btn.is-active')
  return rowEl instanceof HTMLElement ? rowEl : null
}

export function getActiveExplorerRowRevealState({ scrollEl }) {
  const rowEl = getActiveExplorerRow(scrollEl)
  if (!rowEl) return 'missing'

  const delta = getExplorerRevealScrollDelta({
    rowRect: rowEl.getBoundingClientRect(),
    scrollRect: scrollEl.getBoundingClientRect(),
    topGap: DEFAULT_VISIBILITY_TOP_GAP,
    bottomGap: DEFAULT_VISIBILITY_BOTTOM_GAP
  })

  return delta === 0 ? 'visible' : 'hidden'
}

export function revealActiveExplorerRow({ scrollEl }) {
  const rowEl = getActiveExplorerRow(scrollEl)
  if (!rowEl) return

  const delta = getExplorerRevealScrollDelta({
    rowRect: rowEl.getBoundingClientRect(),
    scrollRect: scrollEl.getBoundingClientRect()
  })

  if (delta === 0) return
  scrollEl.scrollBy({ top: delta, behavior: 'auto' })
}
