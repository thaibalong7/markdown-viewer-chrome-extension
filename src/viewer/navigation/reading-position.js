const HEADINGS = 'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'

function headingText(heading) {
  return String(heading?.textContent || '').trim()
}

function contentTop(element, root) {
  return element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
}

export function captureReadingPosition(root, article) {
  if (!root) return null
  const top = root.scrollTop
  const max = Math.max(0, root.scrollHeight - root.clientHeight)
  const headings = Array.from(article?.querySelectorAll?.(HEADINGS) || [])
  let active = null
  for (const heading of headings) {
    if (contentTop(heading, root) <= top + 2) active = heading
    else break
  }
  const snapshot = {
    scrollRoot: root,
    top,
    ratio: max ? top / max : 0,
    headingId: active?.id || null,
    headingText: headingText(active),
    headingIndex: active ? headings.indexOf(active) : -1,
    offset: active ? top - contentTop(active, root) : 0,
    userMoved: false,
    dispose: null
  }
  const moved = () => { snapshot.userMoved = true }
  const keyMoved = (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Enter'].includes(event.key)) moved()
  }
  // Input events distinguish user intent from layout-induced scroll changes.
  // Outline and toolbar navigation originate outside the article scroll root.
  const inputTarget = root.ownerDocument || root
  const events = [['wheel', moved], ['touchmove', moved], ['pointerdown', moved], ['keydown', keyMoved]]
  for (const [name, listener] of events) inputTarget.addEventListener?.(name, listener, { capture: true, passive: true })
  snapshot.dispose = () => {
    for (const [name, listener] of events) inputTarget.removeEventListener?.(name, listener, { capture: true })
  }
  return snapshot
}

export function restoreReadingPosition(snapshot, article) {
  if (!snapshot || snapshot.userMoved) return
  const root = snapshot.scrollRoot
  const max = Math.max(0, root.scrollHeight - root.clientHeight)
  const headings = Array.from(article?.querySelectorAll?.(HEADINGS) || [])
  // An id can be reused after a heading is deleted; verify its text too.
  let heading = headings.find((node) => node.id === snapshot.headingId &&
    headingText(node) === snapshot.headingText)
  if (!heading && snapshot.headingText) {
    heading = headings.filter((node) => headingText(node) === snapshot.headingText)
      .sort((a, b) => Math.abs(headings.indexOf(a) - snapshot.headingIndex) -
        Math.abs(headings.indexOf(b) - snapshot.headingIndex))[0]
  }
  const top = heading ? contentTop(heading, root) + snapshot.offset
    : snapshot.headingId ? snapshot.ratio * max : snapshot.top
  root.scrollTo({ top: Math.min(max, Math.max(0, top)), behavior: 'auto' })
}
