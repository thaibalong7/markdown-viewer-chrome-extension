const FAVICON_ID = 'mdp-viewer-favicon'
const PREVIOUS_REL_ATTR = 'data-mdp-previous-icon-rel'

export function applyViewerFavicon() {
  const head = document.head
  if (!head) return

  // Keep the original nodes in place so teardown can restore their exact state.
  for (const link of head.querySelectorAll('link[rel~="icon" i]')) {
    if (link.id === FAVICON_ID) continue
    if (!link.hasAttribute(PREVIOUS_REL_ATTR)) {
      link.setAttribute(PREVIOUS_REL_ATTR, link.getAttribute('rel'))
    }
    link.relList.remove(...Array.from(link.relList).filter((rel) => rel.toLowerCase() === 'icon'))
  }

  const link = document.getElementById(FAVICON_ID) || document.createElement('link')
  link.id = FAVICON_ID
  link.rel = 'icon'
  link.type = 'image/png'
  link.setAttribute('sizes', '32x32')
  link.href = chrome.runtime.getURL('icons/icon-32.png')
  head.appendChild(link)
}

export function restorePageFavicon() {
  document.getElementById(FAVICON_ID)?.remove()
  for (const link of document.querySelectorAll(`link[${PREVIOUS_REL_ATTR}]`)) {
    link.setAttribute('rel', link.getAttribute(PREVIOUS_REL_ATTR))
    link.removeAttribute(PREVIOUS_REL_ATTR)
  }
}
