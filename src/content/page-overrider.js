import hostPrintCss from './host-print.scss?inline'

const ROOT_ID = 'mdp-viewer-root'
const HOST_PRINT_STYLE_ID = 'mdp-viewer-host-print-style'
const PREV_HTML_OVERFLOW_ATTR = 'data-mdp-prev-html-overflow'
const PREV_BODY_OVERFLOW_ATTR = 'data-mdp-prev-body-overflow'
const PREV_HTML_OVERSCROLL_ATTR = 'data-mdp-prev-html-overscroll'
const HOST_PAGE_CHILD_ATTR = 'data-mdp-host-page-child'
const PREV_DISPLAY_ATTR = 'data-mdp-prev-display'
const BODY_ORIGINAL_HIDDEN_ATTR = 'data-mdp-original-children-hidden'
const LEGACY_PREV_BODY_INERT_ATTR = 'data-mdp-prev-body-inert'

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

function restoreBackgroundScroll(host) {
  const html = document.documentElement
  const body = document.body
  if (!html || !body || !host) return

  html.style.overflow = host.getAttribute(PREV_HTML_OVERFLOW_ATTR) || ''
  body.style.overflow = host.getAttribute(PREV_BODY_OVERFLOW_ATTR) || ''
  html.style.overscrollBehavior = host.getAttribute(PREV_HTML_OVERSCROLL_ATTR) || ''
}

function restoreLegacyBodyInert(host) {
  const body = document.body
  if (!body || !host?.hasAttribute(LEGACY_PREV_BODY_INERT_ATTR)) return
  body.inert = host.getAttribute(LEGACY_PREV_BODY_INERT_ATTR) === '1'
}

function hideOriginalPageChildren(host) {
  const body = document.body
  if (!body || !host) return
  if (body.getAttribute(BODY_ORIGINAL_HIDDEN_ATTR) === '1') return

  for (const child of Array.from(body.children)) {
    if (child === host || child.id === ROOT_ID) continue
    child.setAttribute(HOST_PAGE_CHILD_ATTR, '1')
    child.setAttribute(PREV_DISPLAY_ATTR, child.style.display || '')
    child.style.display = 'none'
  }

  body.setAttribute(BODY_ORIGINAL_HIDDEN_ATTR, '1')
}

function restoreOriginalPageChildren() {
  const body = document.body
  if (!body) return

  for (const child of Array.from(body.children)) {
    if (!child.hasAttribute(HOST_PAGE_CHILD_ATTR)) continue
    child.style.display = child.getAttribute(PREV_DISPLAY_ATTR) || ''
    child.removeAttribute(HOST_PAGE_CHILD_ATTR)
    child.removeAttribute(PREV_DISPLAY_ATTR)
  }

  body.removeAttribute(BODY_ORIGINAL_HIDDEN_ATTR)
}

function ensureHostPrintStyles() {
  if (document.getElementById(HOST_PRINT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HOST_PRINT_STYLE_ID
  style.textContent = hostPrintCss
  document.documentElement.appendChild(style)
}

function getViewerHostParent() {
  return document.body || document.documentElement
}

export function createViewerRoot() {
  const existing = document.getElementById(ROOT_ID)
  if (existing) {
    if (existing.shadowRoot) {
      restoreBackgroundScroll(existing)
      restoreLegacyBodyInert(existing)
      existing.remove()
    } else {
      const parent = getViewerHostParent()
      if (existing.parentNode !== parent) {
        parent.appendChild(existing)
      }
      ensureHostPrintStyles()
      lockBackgroundScroll(existing)
      hideOriginalPageChildren(existing)
      return { root: existing }
    }
  }

  const host = document.createElement('div')
  host.id = ROOT_ID
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.background = '#ffffff'

  const parent = getViewerHostParent()
  parent.appendChild(host)
  ensureHostPrintStyles()
  lockBackgroundScroll(host)
  hideOriginalPageChildren(host)

  return { root: host }
}

export function teardownViewerRoot() {
  const host = document.getElementById(ROOT_ID)
  if (!host) return

  restoreBackgroundScroll(host)
  restoreOriginalPageChildren()
  host.remove()

  const hostPrintStyle = document.getElementById(HOST_PRINT_STYLE_ID)
  hostPrintStyle?.remove()
}
