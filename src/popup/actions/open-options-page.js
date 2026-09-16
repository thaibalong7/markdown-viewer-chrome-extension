export async function openOptionsPage() {
  const open = globalThis.chrome?.runtime?.openOptionsPage
  if (typeof open !== 'function') {
    throw new Error('The Settings page is unavailable in this browser.')
  }
  await open.call(globalThis.chrome.runtime)
}
