export const OUTLINE_AUTO_FOLLOW_PAUSE_MS = 3000
export const OUTLINE_CONTENT_SCROLL_SUPPRESS_MS = 700
export const OUTLINE_REVEAL_EDGE_PADDING_PX = 48

export function getOutlineRevealAction({
  activeIndex,
  activeRow,
  scrollTop,
  viewportHeight,
  edgePadding = OUTLINE_REVEAL_EDGE_PADDING_PX
} = {}) {
  if (!Number.isInteger(activeIndex) || activeIndex < 0) return 'none'
  if (!activeRow) return 'center'

  const viewTop = Number(scrollTop) || 0
  const height = Math.max(0, Number(viewportHeight) || 0)
  if (height <= 0) return 'none'

  const rowTop = Number(activeRow.start)
  const rowEnd = Number(activeRow.end)
  if (!Number.isFinite(rowTop) || !Number.isFinite(rowEnd)) return 'center'

  const padding = Math.max(0, Number(edgePadding) || 0)
  const comfortTop = viewTop + Math.min(padding, height / 2)
  const comfortBottom = viewTop + height - Math.min(padding, height / 2)

  if (rowTop < comfortTop || rowEnd > comfortBottom) return 'center'
  return 'none'
}
