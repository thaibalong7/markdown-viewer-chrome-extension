const OPTIONS_PAGE_PATH = 'src/options/index.html'
const EXPLORER_SECTION_HASH = '#explorer'

export function createOptionsPageService(dependencies = {}) {
  const runtime = dependencies.runtimeApi || globalThis.chrome?.runtime
  const tabs = dependencies.tabsApi || globalThis.chrome?.tabs

  async function openExplorerSettings() {
    if (typeof runtime?.getURL !== 'function' || typeof tabs?.create !== 'function') {
      throw new Error('The Settings page is unavailable in this browser.')
    }

    const url = `${runtime.getURL(OPTIONS_PAGE_PATH)}${EXPLORER_SECTION_HASH}`
    await tabs.create({ url })
  }

  return { openExplorerSettings }
}

export const optionsPageService = createOptionsPageService()
