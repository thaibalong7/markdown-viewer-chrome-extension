/**
 * Extension offscreen context (chrome-extension:// origin).
 * Chrome often reports fetch(file://…) as !ok with status 0 even when a body exists;
 * XMLHttpRequest is more reliable for local file and directory index HTML.
 *
 * Message `type` strings must match `MESSAGE_TYPES.OFFSCREEN_FETCH` /
 * `MESSAGE_TYPES.OFFSCREEN_FETCH_DONE` in `src/messaging/index.js` (this file is not bundled).
 */
const OFFSCREEN_FETCH = 'MDP_OFFSCREEN_FETCH'
const OFFSCREEN_FETCH_DONE = 'MDP_OFFSCREEN_FETCH_DONE'

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
function loadFileUrlAsText(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'text'
    xhr.overrideMimeType('text/html;charset=utf-8')
    xhr.onload = () => {
      const text = xhr.responseText ?? ''
      const st = xhr.status
      // file:// frequently uses 0 for success; 2xx is normal for some builds
      // A completed local file: XHR normally reports status 0, including for a
      // valid empty file. Transport/access failures use the onerror path.
      const looksOk = (st >= 200 && st < 300) || st === 0
      if (looksOk) {
        resolve(text)
        return
      }
      reject(new Error(`XHR HTTP ${st}`))
    }
    xhr.onerror = () => reject(new Error('XHR failed (network or blocked)'))
    xhr.send()
  })
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function loadFileUrlAsTextFetchFallback(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (res.ok && text) return text
  // Some Chrome builds: status 0 but HTML body still present
  if (!res.ok && res.status === 0 && text && text.includes('<')) return text
  throw new Error(`Fetch HTTP ${res.status}`)
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function loadFileUrlAsTextBestEffort(url) {
  try {
    return await loadFileUrlAsText(url)
  } catch (xhrErr) {
    try {
      return await loadFileUrlAsTextFetchFallback(url)
    } catch (fetchErr) {
      const a = xhrErr instanceof Error ? xhrErr.message : String(xhrErr)
      const b = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      throw new Error(`${a} | ${b}`)
    }
  }
}

// Bound binary reads before serialization. Never decode image bytes as UTF-8.
function loadFileUrlAsBytes(url, maxBytes) {
  return new Promise((resolve, reject) => {
    const limit = Math.min(Number(maxBytes) || 0, 5 * 1024 * 1024)
    if (limit <= 0) return reject(new Error('Invalid byte limit'))
    const xhr = new XMLHttpRequest()
    const tooLarge = () => reject(Object.assign(new Error('Image exceeds the Watch limit'), { code: 'document-too-large' }))
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onprogress = (event) => {
      if (event.loaded > limit || (event.lengthComputable && event.total > limit)) {
        tooLarge()
        xhr.abort()
      }
    }
    xhr.onload = () => {
      if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) return reject(new Error(`XHR HTTP ${xhr.status}`))
      if (!(xhr.response instanceof ArrayBuffer)) return reject(new Error('No image bytes received'))
      const bytes = new Uint8Array(xhr.response)
      if (bytes.byteLength > limit) return tooLarge()
      const parts = []
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)))
      }
      resolve({ base64: btoa(parts.join('')), size: bytes.byteLength })
    }
    xhr.onerror = () => reject(new Error('XHR failed (network or blocked)'))
    xhr.onabort = () => reject(new Error('Image read aborted'))
    xhr.send()
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OFFSCREEN_FETCH) return

  const { id, url } = message
  if (!id || !url) {
    void chrome.runtime.sendMessage({
      type: OFFSCREEN_FETCH_DONE,
      id: id || '',
      ok: false,
      error: 'Missing id or url'
    })
    return
  }

  void (async () => {
    try {
      if (new URL(url).protocol !== 'file:') throw new Error('Only file: URLs are allowed')
      const payload = message.format === 'bytes'
        ? await loadFileUrlAsBytes(url, message.maxBytes)
        : { text: await loadFileUrlAsTextBestEffort(url) }
      await chrome.runtime.sendMessage({
        type: OFFSCREEN_FETCH_DONE,
        id,
        ok: true,
        ...payload
      })
    } catch (e) {
      await chrome.runtime.sendMessage({
        type: OFFSCREEN_FETCH_DONE,
        id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        code: e?.code
      })
    }
  })()
})
