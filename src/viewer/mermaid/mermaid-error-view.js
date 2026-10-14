import { mountContentUi, clearContentUi } from '../react/content/mount-content-ui.jsx'
import { MermaidErrorState } from '../react/content/states/DocumentState.jsx'
export function formatMermaidRenderError(error) {
  if (error == null) return 'Unknown error.'
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  const detail = typeof error.str === 'string' ? error.str.trim() : ''
  if (message && detail && detail !== message) return `${message}\n\n${detail}`
  if (message) return message
  if (detail) return detail
  try {
    return String(error)
  } catch {
    return 'Unknown error.'
  }
}

export function setMermaidRenderError(node, source, error) {
  if (!node) return
  node.classList.add('mdp-mermaid--error')
  clearContentUi(node)
  node.replaceChildren()

  return mountContentUi(node, MermaidErrorState, { message: formatMermaidRenderError(error), source: String(source ?? '') })
}
