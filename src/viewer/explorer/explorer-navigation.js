import {
  findHeadingByHash,
  getToolbarHeightInScrollRoot,
  scrollToElementInViewerWithAnchorLock
} from '../scroll-utils.js'
import { parseViewerRoute, writeViewerRoute } from '../navigation/viewer-route.js'
import {
  expandAncestorsForFile
} from './explorer-tree-utils.js'
import {
  explorerTreeContainsFileHref
} from './explorer-files-context.js'
import {
  fileUrlIsUnderDirectoryUrl,
  isWorkspaceVirtualHref,
  documentTitleFromUrl,
  normalizeFileUrlForCompare
} from './url-utils.js'
import { getOriginalFileUrl, isOnOriginalFile } from './explorer-state.js'

export function createSiblingBackNavigationForUrl(openUrl, onNavigate) {
  const original = getOriginalFileUrl()
  const showBack = Boolean(original && !isOnOriginalFile(openUrl))
  if (!showBack) return { showBack: false }
  return {
    showBack: true,
    backLabel: `Back to ${documentTitleFromUrl(original)}`,
    onBack: () => {
      if (!original) return
      void onNavigate?.(original, { replaceHistory: true })
    }
  }
}

export function shouldReuseSiblingTreeAfterNavigation({ currentFileUrl, siblingTree, siblingScanRootUrl }) {
  return Boolean(
    siblingTree &&
      siblingScanRootUrl &&
      currentFileUrl &&
      fileUrlIsUnderDirectoryUrl(currentFileUrl, siblingScanRootUrl)
  )
}

export function focusAfterNavigation(bridge, hash) {
  const article = bridge?.getArticleEl?.()
  if (!(article instanceof HTMLElement)) return
  if (hash) {
    const heading = findHeadingByHash(article, hash)
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
      return
    }
  }
  article.setAttribute('tabindex', '-1')
  article.focus({ preventScroll: true })
}

export function updateUrlWithoutReload(
  fileUrl,
  { entryFileUrl = fileUrl, replace = false, hash = null } = {}
) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
  try {
    return writeViewerRoute({ entryFileUrl, currentFileUrl: fileUrl, hash, replace })
  } catch {
    /* file protocol may reject history updates */
  }
}

export async function navigateFromBrowserHistory({
  locationHref,
  currentFileUrl,
  entryFileUrl,
  navigateToFile,
  restoreUrl = updateUrlWithoutReload,
  getLocationHref = () => locationHref,
  getCurrentFileUrl = () => currentFileUrl
}) {
  const target = parseViewerRoute(locationHref)
  if (!target || typeof navigateToFile !== 'function') return false
  const opened = await navigateToFile(target.targetFileUrl, {
    hash: target.hash,
    updateHistory: false
  })
  const liveTarget = parseViewerRoute(getLocationHref())
  const browserStillAtRejectedTarget = liveTarget?.targetFileUrl === target.targetFileUrl
  const viewerStillAtPreviousDocument =
    normalizeFileUrlForCompare(getCurrentFileUrl()) === normalizeFileUrlForCompare(currentFileUrl)
  if (
    opened === false &&
    browserStillAtRejectedTarget &&
    viewerStillAtPreviousDocument &&
    typeof currentFileUrl === 'string' &&
    currentFileUrl.startsWith('file:')
  ) {
    restoreUrl(currentFileUrl, {
      entryFileUrl: entryFileUrl || target.entryFileUrl,
      replace: false
    })
  }
  return opened !== false
}

export function createHeadingScroller(bridge) {
  return (hash, { behavior = 'auto' } = {}) => {
    const article = bridge?.getArticleEl?.()
    if (!(article instanceof HTMLElement)) return false
    const headingEl = findHeadingByHash(article, hash)
    if (!headingEl) return false

    const scrollRoot = bridge?.getScrollRoot?.()
    if (!scrollRoot) return false

    const toolbarHeight = getToolbarHeightInScrollRoot(scrollRoot)
    scrollToElementInViewerWithAnchorLock({
      element: headingEl,
      scrollRoot,
      layoutRoot: article,
      toolbarHeight,
      behavior
    })
    return true
  }
}

export function revealFileInTree({ refs, stateRef, safePatch }, fileUrl) {
  const tree =
    refs.explorerModeRef.current === 'workspace' ? refs.workspaceTreeRef.current : refs.siblingTreeRef.current
  if (!tree?.children?.length) return
  const nextMap = expandAncestorsForFile(
    tree.children,
    fileUrl,
    stateRef.current.expandedMap,
    normalizeFileUrlForCompare
  )
  if (nextMap !== stateRef.current.expandedMap) {
    safePatch({ expandedMap: nextMap })
  }
}

export function createExplorerNavigator(deps) {
  const {
    bridge,
    refs,
    safePatch,
    buildFilesContext,
    setCurrentFileUrl,
    runSiblingScan,
    syncExplorerBackButton
  } = deps
  const scrollToHeadingHash = createHeadingScroller(bridge)

  const afterSuccessfulNavigation = async ({ hash }) => {
    if (refs.explorerModeRef.current === 'workspace') {
      safePatch({ activeFileUrl: refs.currentFileUrlRef.current, filesContext: buildFilesContext() })
      revealFileInTree({ refs, stateRef: deps.stateRef, safePatch }, refs.currentFileUrlRef.current)
      syncExplorerBackButton()
      return
    }
    if (
      shouldReuseSiblingTreeAfterNavigation({
        currentFileUrl: refs.currentFileUrlRef.current,
        siblingTree: refs.siblingTreeRef.current,
        siblingScanRootUrl: refs.siblingScanRootUrlRef.current
      })
    ) {
      safePatch({ activeFileUrl: refs.currentFileUrlRef.current, filesContext: buildFilesContext() })
      revealFileInTree({ refs, stateRef: deps.stateRef, safePatch }, refs.currentFileUrlRef.current)
      syncExplorerBackButton()
      return
    }
    await runSiblingScan(refs.currentFileUrlRef.current)
  }

  const finishNavigatedDocument = async (
    fileUrl,
    { hash = null, replaceHistory = false, updateHistory = true } = {}
  ) => {
    bridge?.setSmoothInitialHashScroll?.(false)
    setCurrentFileUrl(fileUrl)
    if (updateHistory && !isWorkspaceVirtualHref(fileUrl)) {
      updateUrlWithoutReload(fileUrl, {
        entryFileUrl: bridge?.getEntryFileUrl?.() || fileUrl,
        replace: replaceHistory,
        hash
      })
    }
    const scrolledToHash = hash && scrollToHeadingHash(hash)
    if (!scrolledToHash) {
      bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
    }
    focusAfterNavigation(bridge, hash)
    document.title = `${documentTitleFromUrl(fileUrl)} - Markdown Plus`
  }

  const navigateWorkspaceVirtualFile = async (fileUrl, { hash = null } = {}) => {
    if (!fileUrl) return false
    const current = normalizeFileUrlForCompare(refs.currentFileUrlRef.current)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (current === target) return true

    const entry = refs.workspaceVirtualReadersRef.current?.get(fileUrl)
    if (!entry) {
      bridge?.showToast?.('Linked file is no longer available', { variant: 'error' })
      return false
    }

    const opened = await bridge?.openDocument?.(fileUrl, { workspaceReader: entry })
    if (!opened) return false
    await finishNavigatedDocument(fileUrl, { hash })

    await afterSuccessfulNavigation({ hash })
    return true
  }

  const navigateToFile = async (
    fileUrl,
    {
      replaceHistory = false,
      forceReload = false,
      hash = null,
      syncExplorer = true,
      updateHistory = true
    } = {}
  ) => {
    if (!fileUrl) return false
    if (isWorkspaceVirtualHref(fileUrl)) {
      return navigateWorkspaceVirtualFile(fileUrl, { hash })
    }

    const current = normalizeFileUrlForCompare(refs.currentFileUrlRef.current)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (!forceReload && current === target) {
      const scrolledToHash = hash && scrollToHeadingHash(hash)
      if (!scrolledToHash) bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
      focusAfterNavigation(bridge, hash)
      return true
    }

    const opened = await bridge?.openDocument?.(fileUrl, { forceReload })
    if (!opened) return false
    await finishNavigatedDocument(fileUrl, {
      hash,
      replaceHistory,
      updateHistory: updateHistory && refs.explorerModeRef.current !== 'workspace'
    })

    if (syncExplorer) {
      await afterSuccessfulNavigation({ hash })
    }
    return true
  }

  return {
    navigateToFile,
    navigateWorkspaceVirtualFile,
    scrollToHeadingHash
  }
}

export function workspaceDocumentStillValid({ currentFileUrl, tree, rootForInject }) {
  if (!currentFileUrl) return false
  if (isWorkspaceVirtualHref(currentFileUrl)) {
    return explorerTreeContainsFileHref(tree, currentFileUrl)
  }
  if (currentFileUrl.startsWith('file:') && rootForInject?.startsWith('file:')) {
    return fileUrlIsUnderDirectoryUrl(currentFileUrl, rootForInject)
  }
  return false
}
