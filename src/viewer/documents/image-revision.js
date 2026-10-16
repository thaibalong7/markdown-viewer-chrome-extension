import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'
import { MAX_WATCH_BYTES } from '../../shared/constants/documents.js'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException("Image read was aborted.", 'AbortError')
}

function tooLarge() {
  return Object.assign(new Error('Image exceeds the 5 MiB Watch limit.'), { code: 'document-too-large' })
}

/** Exact bounded bytes are the baseline; same-size/mtime overwrites are detected. */
export async function readImageRevision({ href, file, signal, maxBytes = MAX_WATCH_BYTES }) {
  throwIfAborted(signal)
  let base64
  if (file) {
    if (file.size > maxBytes) throw tooLarge()
    const bytes = new Uint8Array(await file.arrayBuffer())
    throwIfAborted(signal)
    if (bytes.byteLength > maxBytes) throw tooLarge()
    const parts = []
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)))
    }
    base64 = btoa(parts.join(''))
  } else {
    const response = await sendMessage({ type: MESSAGE_TYPES.FETCH_FILE_AS_BYTES, payload: { url: href } })
    throwIfAborted(signal)
    if (!response?.ok) {
      if (response?.code === 'document-too-large') throw tooLarge()
      throw new Error(response?.error || 'Could not read image bytes.')
    }
    if (response.data?.size > maxBytes) throw tooLarge()
    base64 = response.data?.base64
  }
  if (typeof base64 !== 'string') throw new Error('No image bytes received.')
  if (base64.length > Math.ceil(maxBytes / 3) * 4) throw tooLarge()
  return base64
}

export function createImageRevisionPayload(source, fileType) {
  const bytes = Uint8Array.from(atob(source), (character) => character.charCodeAt(0))
  const file = new Blob([bytes], { type: fileType.id === 'svg-image' ? 'image/svg+xml' : '' })
  return { ...createImageAssetPayload(file), revisionSource: source }
}

export function createImageAssetPayload(file) {
  const assetUrl = URL.createObjectURL(file)
  let revoked = false
  return {
    text: null,
    assetUrl,
    revokeAssetUrl() {
      if (revoked) return
      revoked = true
      URL.revokeObjectURL(assetUrl)
    }
  }
}
