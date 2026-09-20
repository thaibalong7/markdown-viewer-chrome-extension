export async function getFileSchemeAccess() {
  const extensionApi = globalThis.chrome?.extension
  const accessApi = extensionApi?.isAllowedFileSchemeAccess
  if (typeof accessApi !== 'function') return null

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (allowed) => {
      if (settled) return
      settled = true
      const runtimeError = globalThis.chrome?.runtime?.lastError
      if (runtimeError) reject(new Error(runtimeError.message))
      else resolve(Boolean(allowed))
    }

    try {
      const result = accessApi.call(extensionApi, finish)
      if (result && typeof result.then === 'function') {
        result.then(finish, reject)
      } else if (typeof result === 'boolean') {
        finish(result)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export async function openExtensionDetails() {
  const runtimeId = globalThis.chrome?.runtime?.id
  const createTab = globalThis.chrome?.tabs?.create
  if (!runtimeId || typeof createTab !== 'function') {
    throw new Error('Extension details are unavailable. Open chrome://extensions manually.')
  }

  await createTab.call(globalThis.chrome.tabs, {
    url: `chrome://extensions/?id=${encodeURIComponent(runtimeId)}`
  })
}
