import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'
import {
  DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
  MAX_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
  MIN_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
} from '../../shared/constants/documents.js'
import { getFileTypeFromName } from '../../shared/file-types.js'
import { readImageRevision, createImageRevisionPayload, createImageAssetPayload } from './image-revision.js'

const BYTES_PER_MIB = 1024 * 1024

export const MAX_PLAIN_TEXT_BYTES =
  DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB * BYTES_PER_MIB

export class DocumentTooLargeError extends Error {
  constructor(maxBytes = MAX_PLAIN_TEXT_BYTES) {
    const maxSizeMiB = Math.floor(maxBytes / BYTES_PER_MIB)
    super(`This text file is larger than the ${maxSizeMiB} MiB viewing limit.`)
    this.name = 'DocumentTooLargeError'
    this.code = 'document-too-large'
    this.userMessage = this.message
  }
}

function abortError() {
  return new DOMException('Document load was aborted.', 'AbortError')
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError()
}

function utf8ByteLength(value) {
  return new TextEncoder().encode(String(value ?? '')).byteLength
}

function resolveStandaloneTextMaxBytes(maxSizeMiB) {
  const normalized = Number(maxSizeMiB)
  const safeSizeMiB =
    Number.isInteger(normalized) &&
    normalized >= MIN_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB &&
    normalized <= MAX_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
    ? normalized
    : DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
  return safeSizeMiB * BYTES_PER_MIB
}

function enforceStandaloneTextLimit(fileType, byteLength, maxBytes) {
  if (['text', 'sql', 'dbml', 'mermaid'].includes(fileType?.id) && byteLength > maxBytes) {
    throw new DocumentTooLargeError(maxBytes)
  }
}

function normalizedLocalAssetUrl(href) {
  const url = new URL(href)
  if (url.protocol !== 'file:') throw new Error('Only local image files can be opened.')
  url.search = ''
  url.hash = ''
  return url.href
}

function validateWorkspaceImage(file, fileType) {
  if (!file || typeof file !== 'object') throw new Error('Could not read this image file.')
  if (file.name && getFileTypeFromName(file.name)?.id !== fileType.id) {
    throw new Error('The selected workspace file is not a registered image format.')
  }
  const mimeType = String(file.type || '').toLowerCase()
  if (mimeType && !fileType.mimeTypes?.includes(mimeType)) {
    throw new Error('The selected workspace file has an unsupported image type.')
  }
}

async function loadImageDocument({ href, fileType, workspaceReader, signal, revisionOnly, maxWatchBytes }) {
  const file = workspaceReader
    ? typeof workspaceReader.getFile === 'function' ? await workspaceReader.getFile() : workspaceReader
    : null
  throwIfAborted(signal)
  if (file) validateWorkspaceImage(file, fileType)
  let payload
  try {
    const revisionSource = await readImageRevision({ href, file, signal, maxBytes: maxWatchBytes })
    if (revisionOnly) return { revisionSource }
    payload = createImageRevisionPayload(revisionSource, fileType)
  } catch (error) {
    // Large images remain viewable through the existing resource path.
    if (revisionOnly || error?.code !== 'document-too-large') throw error
    if (!file) {
      return { text: null, assetUrl: normalizedLocalAssetUrl(href), revokeAssetUrl: null }
    }
    payload = createImageAssetPayload(file)
  }
  if (signal?.aborted) {
    payload.revokeAssetUrl()
    throw abortError()
  }
  return payload
}

export async function loadDocument({
  href,
  fileType,
  workspaceReader,
  signal,
  maxStandaloneTextFileSizeMiB,
  maxWatchBytes,
  revisionOnly = false
}) {
  throwIfAborted(signal)
  if (!fileType) {
    throw new Error('This document type is not loadable yet.')
  }
  if (fileType.contentKind === 'image') {
    return loadImageDocument({ href, fileType, workspaceReader, signal, revisionOnly, maxWatchBytes })
  }
  if (fileType.contentKind !== 'text') throw new Error('This document type is not loadable yet.')
  const maxStandaloneTextBytes = resolveStandaloneTextMaxBytes(maxStandaloneTextFileSizeMiB)

  let text
  if (workspaceReader) {
    const file = typeof workspaceReader.text === 'function'
      ? workspaceReader
      : await workspaceReader.getFile()
    throwIfAborted(signal)
    if (maxWatchBytes && file?.size > maxWatchBytes) throw new DocumentTooLargeError(maxWatchBytes)
    if (Number.isFinite(file?.size)) {
      enforceStandaloneTextLimit(fileType, file.size, maxStandaloneTextBytes)
    }
    text = await file.text()
  } else {
    text = await readLocalTextResource(href, { signal })
  }

  throwIfAborted(signal)
  const textBytes = utf8ByteLength(text)
  if (maxWatchBytes && textBytes > maxWatchBytes) throw new DocumentTooLargeError(maxWatchBytes)
  enforceStandaloneTextLimit(fileType, textBytes, maxStandaloneTextBytes)
  return { text: String(text ?? ''), assetUrl: null, revokeAssetUrl: null }
}

// Shared local-file I/O for text documents and SVG image rasterization.
export async function readLocalTextResource(href, { signal } = {}) {
  throwIfAborted(signal)
  const response = await sendMessage({
    type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
    payload: { url: href }
  })
  throwIfAborted(signal)
  if (!response?.ok) throw new Error(response?.error || 'Could not open document.')
  return String(response.data?.text ?? '')
}
