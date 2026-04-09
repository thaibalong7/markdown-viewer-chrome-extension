const ROOT_ID = 'mdp-viewer-root'
const PREV_HTML_OVERFLOW_ATTR = 'data-mdp-prev-html-overflow'
const PREV_BODY_OVERFLOW_ATTR = 'data-mdp-prev-body-overflow'
const PREV_HTML_OVERSCROLL_ATTR = 'data-mdp-prev-html-overscroll'
const PREV_BODY_ARIA_HIDDEN_ATTR = 'data-mdp-prev-body-aria-hidden'
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
  if (!host.hasAttribute(PREV_BODY_ARIA_HIDDEN_ATTR)) {
    body.hasAttribute('aria-hidden')
      ? host.setAttribute(PREV_BODY_ARIA_HIDDEN_ATTR, body.getAttribute('aria-hidden') || '')
      : host.setAttribute(PREV_BODY_ARIA_HIDDEN_ATTR, '__MISSING__')
  }

  if (!host.hasAttribute(PREV_BODY_INERT_ATTR)) {
    host.setAttribute(PREV_BODY_INERT_ATTR, body.inert ? '1' : '0')
  }

  // Prevent browser find/search from matching both the original page and viewer text.
  body.setAttribute('aria-hidden', 'true')
  body.inert = true
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
