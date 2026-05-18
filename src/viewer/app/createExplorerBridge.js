/**
 * @param {object} options
 * @param {() => object} options.getSettings
 * @param {(markdown: string) => void} options.setMarkdown
 * @param {(value: boolean) => void} options.setSmoothInitialHashScroll
 * @param {(opts?: object) => Promise<unknown>} options.render
 * @param {(message: string) => void} options.showToast
 * @param {() => (HTMLElement | null)} options.getScrollRoot
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => string} options.getCurrentFileUrl
 * @param {(nextUrl: string) => void} options.updateCurrentFileUrl
 */
export function createExplorerBridge({
  getSettings,
  setMarkdown,
  setSmoothInitialHashScroll,
  render,
  showToast,
  getScrollRoot,
  getArticleEl,
  getCurrentFileUrl,
  updateCurrentFileUrl
}) {
  return {
    getSettings,
    setMarkdown,
    setSmoothInitialHashScroll,
    render,
    showToast,
    getScrollRoot,
    getArticleEl,
    getCurrentFileUrl,
    updateCurrentFileUrl,
    navigateToFile: null,
    virtualFileExists: null
  }
}
