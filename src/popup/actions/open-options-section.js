export async function openOptionsSection(sectionId) {
  const normalizedSectionId = String(sectionId || '').trim()
  if (!/^[a-z0-9-]+$/.test(normalizedSectionId)) {
    throw new Error('Choose a valid Settings section.')
  }

  const runtime = globalThis.chrome?.runtime
  const createTab = globalThis.chrome?.tabs?.create
  if (typeof runtime?.getURL !== 'function' || typeof createTab !== 'function') {
    throw new Error('The Settings page is unavailable in this browser.')
  }

  const optionsUrl = runtime.getURL('src/options/index.html')
  await createTab.call(globalThis.chrome.tabs, {
    url: `${optionsUrl}#${encodeURIComponent(normalizedSectionId)}`
  })
}
