/**
 * @param {string} text
 */
function normalizeTitle(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Parse ATX headings for TOC → editor line lookup.
 * @param {string} markdown
 * @returns {{ line: number, level: number, text: string }[]}
 */
function findAtxHeadingLines(markdown) {
  const str = String(markdown || '')
  if (!str) return []
  const lines = str.split(/\n/)
  /** @type {{ line: number, level: number, text: string }[]} */
  const out = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] || ''
    const m = line.match(/^(\s*)(#{1,6})\s+(.*)$/)
    if (m) {
      const level = m[2].length
      const raw = String(m[3] || '')
      const text = raw.replace(/#+\s*$/, '').replace(/\s+$/, '').trim()
      if (text) {
        out.push({ line: i + 1, level, text })
      }
    }
  }
  return out
}

/**
 * @param {string} markdown
 * @param {string} headingText
 * @returns {number | null} 1-based line, or null
 */
export function findLineForHeadingText(markdown, headingText) {
  const want = normalizeTitle(headingText)
  if (!want) return null
  const found = findAtxHeadingLines(markdown)
  for (const h of found) {
    if (normalizeTitle(h.text) === want) {
      return h.line
    }
  }
  return null
}

/**
 * Vertical offset of `el` within `scrollContainer` scroll coordinate space.
 * @param {Element} scrollContainer
 * @param {Element} el
 * @returns {number}
 */
export function getOffsetTopInScrollContainer(scrollContainer, el) {
  if (!scrollContainer || !el || !scrollContainer.contains(el)) return 0
  const cr = scrollContainer.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  return er.top - cr.top + scrollContainer.scrollTop
}

/**
 * @param {HTMLElement} scroller
 * @returns {number} 0..1
 */
export function getScrollFraction(scroller) {
  if (!scroller) return 0
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, scroller.scrollTop / max))
}

/**
 * Upward pixel nudge applied to every scroll-sync target so the preview sits
 * slightly above the raw mapped position.  Increase to pull the preview further
 * back (toward the top); decrease (or set to 0) for 1-to-1 mapping.
 *
 * Tweak this value if the preview still feels ahead/behind the editor.
 * ~24 px ≈ roughly 1–2 lines of body text at default font size.
 */
export const PREVIEW_SCROLL_OFFSET_PX = -24

/**
 * @param {number} topLine0Float - 0-based source line (may be fractional, e.g. 2.35)
 * @param {HTMLElement} scrollContainer - Usually `.mdp-content-pane` (preview)
 * @param {number} editorScrollFraction - 0..1 editor scroll, used only when no `[data-line]` markers
 * @returns {number} target scrollTop (px)
 */
export function computePreviewScrollTarget(topLine0Float, scrollContainer, editorScrollFraction) {
  if (!scrollContainer) return 0
  const line = Number.isFinite(topLine0Float) ? topLine0Float : 0
  const frac =
    typeof editorScrollFraction === 'number' && Number.isFinite(editorScrollFraction)
      ? Math.min(1, Math.max(0, editorScrollFraction))
      : 0
  const yRatio = frac * Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)

  const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  if (frac >= 0.995) return maxScroll
  if (frac <= 0.005) return 0

  const raw = scrollContainer.querySelectorAll('[data-line]')
  /** @type {{ el: Element, line: number }[]} */
  const markers = []
  for (const el of raw) {
    if (!(el instanceof Element)) continue
    const v = el.getAttribute('data-line')
    const n = v != null ? parseInt(String(v), 10) : NaN
    if (!Number.isFinite(n)) continue
    markers.push({ el, line: n })
  }
  if (!markers.length) {
    return yRatio
  }
  markers.sort((a, b) => a.line - b.line || 0)
  /** Prefer topmost element when multiple share the same source line. */
  const byLine = new Map()
  for (const m of markers) {
    const y0 = getOffsetTopInScrollContainer(scrollContainer, m.el)
    const cur = byLine.get(m.line)
    if (cur == null || y0 < cur.y) {
      byLine.set(m.line, { el: m.el, y: y0 })
    }
  }
  const unique = [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ln, v]) => ({ line: ln, el: v.el }))

  let above = null
  let below = null
  for (const m of unique) {
    if (m.line <= line) {
      above = m
    } else {
      below = m
      break
    }
  }

  if (above && below) {
    const yA = getOffsetTopInScrollContainer(scrollContainer, above.el)
    const yB = getOffsetTopInScrollContainer(scrollContainer, below.el)
    const lineA = above.line
    const lineB = below.line
    const t = lineB > lineA ? (line - lineA) / (lineB - lineA) : 0
    const yFrom = yA + t * (yB - yA) - PREVIEW_SCROLL_OFFSET_PX
    return Math.min(maxScroll, Math.max(0, yFrom))
  }
  if (above && !below) {
    const yA = getOffsetTopInScrollContainer(scrollContainer, above.el) - PREVIEW_SCROLL_OFFSET_PX
    return Math.min(maxScroll, Math.max(yA, yRatio))
  }
  if (!above && below) {
    const yB = getOffsetTopInScrollContainer(scrollContainer, below.el)
    const lineB = below.line
    const t = lineB > 0 ? line / lineB : 0
    const yFrom = t * yB - PREVIEW_SCROLL_OFFSET_PX
    return Math.min(maxScroll, Math.max(0, yFrom))
  }
  return yRatio
}

const smoothRaf = new WeakMap()
const smoothState = new WeakMap()

/**
 * Lerp `scrollTop` toward `targetTop` on each animation frame (avoids `behavior: 'smooth'`
 * stacking and matches live split-preview expectations).
 * @param {HTMLElement | null} scrollContainer
 * @param {number} targetTop
 * @param {{ strength?: number, epsilon?: number } | undefined} [opt]
 */
export function smoothScrollPreviewTo(scrollContainer, targetTop, opt) {
  if (!scrollContainer) return
  const max = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  const target = Math.min(max, Math.max(0, targetTop))
  const strength = opt?.strength != null && Number.isFinite(opt.strength) ? opt.strength : 0.24
  const epsilon = opt?.epsilon != null && Number.isFinite(opt.epsilon) ? opt.epsilon : 0.55

  let s = smoothState.get(scrollContainer)
  if (!s) {
    s = { target }
    smoothState.set(scrollContainer, s)
  } else {
    s.target = target
  }
  if (smoothRaf.get(scrollContainer) != null) return

  const step = () => {
    const st = smoothState.get(scrollContainer)
    if (!st) {
      smoothRaf.delete(scrollContainer)
      return
    }
    const cur = scrollContainer.scrollTop
    const t = st.target
    const diff = t - cur
    if (Math.abs(diff) <= epsilon) {
      scrollContainer.scrollTop = t
      smoothRaf.delete(scrollContainer)
      return
    }
    scrollContainer.scrollTop = cur + diff * strength
    const id = requestAnimationFrame(step)
    smoothRaf.set(scrollContainer, id)
  }
  const id = requestAnimationFrame(step)
  smoothRaf.set(scrollContainer, id)
}

/**
 * Stop any in-flight `smoothScrollPreviewTo` lerp for `scrollContainer` (e.g. when the user
 * takes over preview scrolling, so programmatic scrollTop updates do not fight the gesture).
 * @param {HTMLElement | null | undefined} scrollContainer
 */
export function cancelSmoothScroll(scrollContainer) {
  if (!scrollContainer) return
  const id = smoothRaf.get(scrollContainer)
  if (id != null) {
    cancelAnimationFrame(id)
  }
  smoothRaf.delete(scrollContainer)
  smoothState.delete(scrollContainer)
}
