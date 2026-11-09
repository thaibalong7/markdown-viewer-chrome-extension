/** Visible line boxes, merged across inline syntax spans; no document decorations. */
export function getCurrentMatchRects(range, scrollRoot) {
  if (!range?.getClientRects || !range.startContainer?.isConnected) return []
  const doc = range.startContainer.ownerDocument
  const bounds = scrollRoot?.getBoundingClientRect?.() || { left: 0, top: 0, right: doc.documentElement.clientWidth, bottom: doc.documentElement.clientHeight }
  const clip = { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom }
  for (let node = range.startContainer.parentElement; node && node !== scrollRoot; node = node.parentElement) {
    const style = doc.defaultView.getComputedStyle(node)
    if (node.scrollWidth > node.clientWidth && /auto|scroll|hidden|clip/.test(style.overflowX)) {
      const rect = node.getBoundingClientRect()
      clip.left = Math.max(clip.left, rect.left); clip.right = Math.min(clip.right, rect.right)
    }
    if (node.scrollHeight > node.clientHeight && /auto|scroll|hidden|clip/.test(style.overflowY)) {
      const rect = node.getBoundingClientRect()
      clip.top = Math.max(clip.top, rect.top); clip.bottom = Math.min(clip.bottom, rect.bottom)
    }
  }
  const boxes = []
  for (const rect of [...range.getClientRects()].slice(0, 64)) {
    const left = Math.max(clip.left, rect.left), right = Math.min(clip.right, rect.right)
    const top = Math.max(clip.top, rect.top), bottom = Math.min(clip.bottom, rect.bottom)
    if (right <= left || bottom <= top) continue
    const previous = boxes.at(-1)
    if (previous && Math.abs(previous.top - top) < 2 && Math.abs(previous.height - (bottom - top)) < 2 && left <= previous.left + previous.width + 2) {
      previous.width = Math.max(previous.left + previous.width, right) - previous.left
    } else boxes.push({ left, top, width: right - left, height: bottom - top })
  }
  return boxes
}
