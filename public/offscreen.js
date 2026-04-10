/**
 * Extension offscreen context (chrome-extension:// origin).
 * Chrome often reports fetch(file://…) as !ok with status 0 even when a body exists;
 * XMLHttpRequest is more reliable for local file and directory index HTML.
 */

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
      const looksOk =
        (st >= 200 && st < 300) || (st === 0 && text.length > 0)
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'MDP_OFFSCREEN_FETCH') return

  const { id, url } = message
  if (!id || !url) {
    void chrome.runtime.sendMessage({
      type: 'MDP_OFFSCREEN_FETCH_DONE',
      id: id || '',
      ok: false,
      error: 'Missing id or url'
    })
    return
  }

  void (async () => {
    try {
      const text = await loadFileUrlAsTextBestEffort(url)
      await chrome.runtime.sendMessage({
        type: 'MDP_OFFSCREEN_FETCH_DONE',
        id,
        ok: true,
        text
      })
    } catch (e) {
      await chrome.runtime.sendMessage({
        type: 'MDP_OFFSCREEN_FETCH_DONE',
        id,
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  })()
})
