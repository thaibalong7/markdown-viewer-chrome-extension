import { getDocumentCapabilities, getFileTypeFromUrl } from '../../shared/file-types.js'
import { MDP_WS_FILE } from '../../shared/constants/explorer.js'

export function documentDisplayNameFromUrl(href) {
  if (typeof href !== 'string' || !href) return ''
  try {
    const rawName = href.startsWith(MDP_WS_FILE)
      ? decodeURIComponent(href.slice(MDP_WS_FILE.length)).split('/').filter(Boolean).pop()
      : new URL(href).pathname.split('/').filter(Boolean).pop()
    return href.startsWith(MDP_WS_FILE) ? rawName || '' : decodeURIComponent(rawName || '')
  } catch {
    return ''
  }
}

export function createDocumentIdentity(href, { fileTypeId, displayName, sourceKind, viewMode } = {}) {
  const fileType = fileTypeId ? { id: fileTypeId } : getFileTypeFromUrl(href)
  if (!fileType?.id) return null
  return Object.freeze({
    href: String(href || ''),
    displayName: displayName || documentDisplayNameFromUrl(href),
    fileTypeId: fileType.id,
    sourceKind: sourceKind || (String(href).startsWith(MDP_WS_FILE) ? 'workspace-file' : 'file-url'),
    viewMode: viewMode || 'rendered'
  })
}

export function createDocumentUiState(document, { loading = false, error = null } = {}) {
  const capabilities = getDocumentCapabilities(document?.fileTypeId) || {}
  return {
    displayName: document?.displayName || '',
    fileTypeId: document?.fileTypeId || null,
    capabilities,
    viewMode: document?.viewMode || 'rendered',
    sourceKind: document?.sourceKind || null,
    loading: Boolean(loading),
    error: error || null
  }
}
