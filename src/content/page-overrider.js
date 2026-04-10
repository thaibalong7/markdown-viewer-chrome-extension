const ROOT_ID = 'mdp-viewer-root'
const PREV_HTML_OVERFLOW_ATTR = 'data-mdp-prev-html-overflow'
const PREV_BODY_OVERFLOW_ATTR = 'data-mdp-prev-body-overflow'
const PREV_HTML_OVERSCROLL_ATTR = 'data-mdp-prev-html-overscroll'
const PREV_BODY_INERT_ATTR = 'data-mdp-prev-body-inert'

function lockBackgroundScroll(host) {
  const html = document.documentElement
  const body = document.body
  if (!html || !body || !host) return

  if (!host.hasAttribute(PREV_HTML_OVERFLOW_ATTR)) {
    host.setAttribute(PREV_HTML_OVERFLOW_ATTR, html.style.overflow || '')
  }
  if (!host.hasAttribute(PREV_BODY_OVERFLOW_ATTR)) {
    host.setAttribute(PREV_BODY_OVERFLOW_ATTR, body.style.overflow || '')
  }
  if (!host.hasAttribute(PREV_HTML_OVERSCROLL_ATTR)) {
    host.setAttribute(PREV_HTML_OVERSCROLL_ATTR, html.style.overscrollBehavior || '')
  }

  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
}

function restoreOriginalPageVisibility(host) {
  const body = document.body
  if (!body || !host) return
  // Keep body in normal layout so third-party diagram/layout code can measure the page.
  if (!host.hasAttribute(PREV_BODY_INERT_ATTR)) {
    host.setAttribute(PREV_BODY_INERT_ATTR, body.inert ? '1' : '0')
  }

  // Exclude the underlying document from interaction while the viewer is open.
  // Use inert only: aria-hidden on <body> triggers a Chrome warning and hides the whole tree from AT.
  body.inert = true
}

function restoreBackgroundScroll(host) {
  const html = document.documentElement
  const body = document.body
  if (!html || !body || !host) return

  html.style.overflow = host.getAttribute(PREV_HTML_OVERFLOW_ATTR) || ''
  body.style.overflow = host.getAttribute(PREV_BODY_OVERFLOW_ATTR) || ''
  html.style.overscrollBehavior = host.getAttribute(PREV_HTML_OVERSCROLL_ATTR) || ''
}

function restoreOriginalPageInteractivity(host) {
  const body = document.body
  if (!body || !host) return

  const prevInert = host.getAttribute(PREV_BODY_INERT_ATTR)
  body.inert = prevInert === '1'
}

export function createViewerRoot() {
  const existing = document.getElementById(ROOT_ID)
  if (existing) {
    lockBackgroundScroll(existing)
    restoreOriginalPageVisibility(existing)
    return {
      root: existing,
      shadowRoot: existing.shadowRoot || null
    }
  }

  const host = document.createElement('div')
  host.id = ROOT_ID
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.zIndex = '2147483647'
  host.style.background = '#ffffff'

  document.documentElement.appendChild(host)
  lockBackgroundScroll(host)
  restoreOriginalPageVisibility(host)

  let shadowRoot = null
  if (host.attachShadow) {
    shadowRoot = host.attachShadow({ mode: 'open' })
  }

  return {
    root: host,
    shadowRoot
  }
}

export function teardownViewerRoot() {
  const host = document.getElementById(ROOT_ID)
  if (!host) return

  restoreBackgroundScroll(host)
  restoreOriginalPageInteractivity(host)
  host.remove()
}
