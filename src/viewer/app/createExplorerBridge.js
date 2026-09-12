/**
 * @param {object} options
 * @param {() => object} options.getSettings
 * @param {(value: boolean) => void} options.setSmoothInitialHashScroll
 * @param {(href: string, opts?: object) => Promise<boolean>} options.openDocument
 * @param {(text: string) => Promise<boolean>} options.showPlaceholder
 * @param {(message: string, options?: object) => void} options.showToast
 * @param {() => (HTMLElement | null)} options.getScrollRoot
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => string} options.getCurrentFileUrl
 * @param {(nextUrl: string) => void} options.updateCurrentFileUrl
 */
export function createExplorerBridge({
  getSettings,
  setSmoothInitialHashScroll,
  openDocument,
  showPlaceholder,
  showToast,
  getScrollRoot,
  getArticleEl,
  getCurrentFileUrl,
  updateCurrentFileUrl
}) {
  return {
    getSettings,
    setSmoothInitialHashScroll,
    openDocument,
    showPlaceholder,
    showToast,
    getScrollRoot,
    getArticleEl,
    getCurrentFileUrl,
    updateCurrentFileUrl,
    navigateToFile: null,
    virtualFileExists: null
  }
}
