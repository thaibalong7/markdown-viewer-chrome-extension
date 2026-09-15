import { MDP_WS_FILE } from './constants/explorer.js'

const MARKDOWN_CAPABILITIES = Object.freeze({
  outline: true,
  edit: true,
  exportDocument: true,
  print: true,
  viewModes: Object.freeze(['rendered']),
  zoom: true
})

const TEXT_CAPABILITIES = Object.freeze({
  outline: false,
  edit: false,
  exportDocument: false,
  print: true,
  viewModes: Object.freeze(['rendered']),
  zoom: false
})

const IMAGE_CAPABILITIES = Object.freeze({
  outline: false,
  edit: false,
  exportDocument: false,
  print: true,
  viewModes: Object.freeze(['rendered']),
  zoom: true
})

const MERMAID_CAPABILITIES = Object.freeze({
  outline: false,
  edit: false,
  exportDocument: false,
  print: true,
  viewModes: Object.freeze(['rendered', 'raw']),
  zoom: true
})

const FILE_TYPES = Object.freeze([
  Object.freeze({
    id: 'markdown',
    extensions: Object.freeze(['md', 'markdown', 'mdown', 'mdc']),
    activation: 'direct',
    contentKind: 'text',
    rendererId: 'markdown',
    label: 'Markdown document',
    explorerIcon: 'document',
    capabilities: MARKDOWN_CAPABILITIES
  }),
  Object.freeze({
    id: 'text',
    extensions: Object.freeze(['txt']),
    activation: 'explorer-only',
    contentKind: 'text',
    rendererId: 'text',
    label: 'Plain text document',
    explorerIcon: 'text',
    capabilities: TEXT_CAPABILITIES
  }),
  Object.freeze({
    id: 'sql',
    extensions: Object.freeze(['sql']),
    activation: 'explorer-only',
    contentKind: 'text',
    rendererId: 'sql',
    label: 'SQL document',
    explorerIcon: 'database',
    capabilities: TEXT_CAPABILITIES
  }),
  Object.freeze({
    id: 'mermaid',
    extensions: Object.freeze(['mermaid']),
    activation: 'explorer-only',
    contentKind: 'text',
    rendererId: 'mermaid',
    label: 'Mermaid diagram',
    explorerIcon: 'diagram',
    capabilities: MERMAID_CAPABILITIES
  }),
  Object.freeze({
    id: 'raster-image',
    extensions: Object.freeze(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'apng']),
    activation: 'explorer-only',
    contentKind: 'image',
    rendererId: 'image',
    label: 'Image',
    explorerIcon: 'image',
    mimeTypes: Object.freeze([
      'image/png',
      'image/x-png',
      'image/apng',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/bmp',
      'image/x-bmp',
      'image/x-ms-bmp',
      'image/ico',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ]),
    capabilities: IMAGE_CAPABILITIES
  }),
  Object.freeze({
    id: 'svg-image',
    extensions: Object.freeze(['svg']),
    activation: 'explorer-only',
    contentKind: 'image',
    rendererId: 'image',
    label: 'SVG image',
    explorerIcon: 'vector-image',
    mimeTypes: Object.freeze(['image/svg+xml']),
    capabilities: IMAGE_CAPABILITIES
  })
])

const FILE_TYPES_BY_ID = new Map(FILE_TYPES.map((fileType) => [fileType.id, fileType]))
const FILE_TYPES_BY_EXTENSION = new Map(
  FILE_TYPES.flatMap((fileType) =>
    fileType.extensions.map((extension) => [extension.toLowerCase(), fileType])
  )
)

function fileExtensionFromName(name) {
  if (typeof name !== 'string' || !name || /[\\/]$/.test(name)) return ''
  const leaf = name.split(/[\\/]/).pop() || ''
  const dotIndex = leaf.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === leaf.length - 1) return ''
  return leaf.slice(dotIndex + 1).toLowerCase()
}

/**
 * Classify a filename or relative path without decoding it.
 * @param {string} name
 */
export function getFileTypeFromName(name) {
  return FILE_TYPES_BY_EXTENSION.get(fileExtensionFromName(name)) || null
}

/**
 * Classify a real local-file URL or a workspace virtual-file URL.
 * Query and fragment components on real URLs do not affect classification.
 * @param {string | URL} value
 */
export function getFileTypeFromUrl(value) {
  const raw = value instanceof URL ? value.href : value
  if (typeof raw !== 'string' || !raw) return null

  if (raw.startsWith(MDP_WS_FILE)) {
    return getFileTypeFromName(raw.slice(MDP_WS_FILE.length))
  }

  try {
    const parsed = value instanceof URL ? value : new URL(raw)
    if (parsed.protocol !== 'file:' || parsed.pathname.endsWith('/')) return null
    return getFileTypeFromName(parsed.pathname)
  } catch {
    return null
  }
}

/** @param {string | URL} url */
export function isDirectActivationUrl(url) {
  const raw = url instanceof URL ? url.href : url
  if (typeof raw !== 'string' || raw.startsWith(MDP_WS_FILE)) return false
  try {
    const parsed = url instanceof URL ? url : new URL(raw)
    return parsed.protocol === 'file:' && getFileTypeFromUrl(parsed)?.activation === 'direct'
  } catch {
    return false
  }
}

/** @param {string | URL} nameOrUrl */
export function isExplorerSupportedFile(nameOrUrl) {
  if (nameOrUrl instanceof URL) return Boolean(getFileTypeFromUrl(nameOrUrl))
  if (typeof nameOrUrl !== 'string' || !nameOrUrl) return false
  if (nameOrUrl.startsWith(MDP_WS_FILE) || /^[a-z][a-z\d+.-]*:/i.test(nameOrUrl)) {
    return Boolean(getFileTypeFromUrl(nameOrUrl))
  }
  return Boolean(getFileTypeFromName(nameOrUrl))
}

/** @param {string} fileTypeId */
export function getDocumentCapabilities(fileTypeId) {
  return FILE_TYPES_BY_ID.get(fileTypeId)?.capabilities || null
}

/** @param {string} fileTypeId */
export function getFileTypeById(fileTypeId) {
  return FILE_TYPES_BY_ID.get(fileTypeId) || null
}

/**
 * Remove a registered extension while preserving the rest of the filename.
 * @param {string} name
 */
export function stripRegisteredFileExtension(name) {
  const value = String(name || '')
  if (!getFileTypeFromName(value)) return value
  const dotIndex = value.lastIndexOf('.')
  return dotIndex > 0 ? value.slice(0, dotIndex) : value
}

export const MARKDOWN_FILE_EXTENSIONS = FILE_TYPES_BY_ID.get('markdown').extensions
