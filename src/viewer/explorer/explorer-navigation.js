import { logger } from '../../shared/logger.js'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import {
  findHeadingByHash,
  getToolbarHeightInScrollRoot,
  hashTargetToUrlFragment,
  scrollToElementInViewer
} from '../scroll-utils.js'
import {
  expandAncestorsForFile
} from './explorer-tree-utils.js'
import {
  explorerTreeContainsFileHref
} from './explorer-files-context.js'
import {
  fileUrlIsUnderDirectoryUrl,
  isWorkspaceVirtualHref,
  markdownFileTitleFromUrl,
  normalizeFileUrlForCompare
} from './url-utils.js'
import { getOriginalFileUrl, isOnOriginalFile } from './explorer-state.js'

const DEFERRED_SCROLL_DELAY_MS = 200

export function createSiblingBackNavigationForUrl(openUrl, onNavigate) {
  const original = getOriginalFileUrl()
  const showBack = Boolean(original && !isOnOriginalFile(openUrl))
  if (!showBack) return { showBack: false }
  return {
    showBack: true,
    backLabel: `Back to ${markdownFileTitleFromUrl(original)}`,
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

export function deferredScrollRetry(hash, scrollToHeadingHash) {
  if (!hash) return
  requestAnimationFrame(() => {
    setTimeout(() => {
      scrollToHeadingHash(hash, { behavior: 'auto' })
    }, DEFERRED_SCROLL_DELAY_MS)
  })
}

export function updateUrlWithoutReload(fileUrl, { replace = false, hash = null } = {}) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
  try {
    const nextUrl = new URL(fileUrl)
    nextUrl.hash = hash ? hashTargetToUrlFragment(hash) : ''
    if (replace) window.history.replaceState(null, '', nextUrl.href)
    else window.history.pushState(null, '', nextUrl.href)
  } catch {
    /* file protocol may reject history updates */
  }
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
    scrollToElementInViewer({ element: headingEl, scrollRoot, toolbarHeight, behavior })
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
    syncExplorerBackButton,
    sendMessage
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

  const renderNavigatedMarkdown = async (fileUrl, nextMarkdown, { hash = null, replaceHistory = false } = {}) => {
    bridge?.setMarkdown?.(nextMarkdown)
    bridge?.setSmoothInitialHashScroll?.(false)
    setCurrentFileUrl(fileUrl)
    await bridge?.render?.({ preserveScroll: false, honorHash: false })
    if (!isWorkspaceVirtualHref(fileUrl)) {
      updateUrlWithoutReload(fileUrl, { replace: replaceHistory, hash })
    }
    const scrolledToHash = hash && scrollToHeadingHash(hash)
    if (!scrolledToHash) {
      bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
    }
    focusAfterNavigation(bridge, hash)
    if (scrolledToHash) deferredScrollRetry(hash, scrollToHeadingHash)
    document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
  }

  const navigateWorkspaceVirtualFile = async (fileUrl, { hash = null } = {}) => {
    if (!fileUrl) return
    const current = normalizeFileUrlForCompare(refs.currentFileUrlRef.current)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (current === target) return

    const entry = refs.workspaceVirtualReadersRef.current?.get(fileUrl)
    if (!entry) {
      bridge?.showToast?.('Linked file is no longer available', { variant: 'error' })
      return
    }

    bridge?.getArticleEl?.()?.setAttribute('aria-busy', 'true')
    try {
      let nextMarkdown = ''
      if (entry instanceof File) {
        nextMarkdown = await entry.text()
      } else {
        const file = await entry.getFile()
        nextMarkdown = await file.text()
      }
      if (!nextMarkdown.trim()) {
        bridge?.showToast?.('Linked file is empty', { variant: 'warning' })
        return
      }

      await renderNavigatedMarkdown(fileUrl, nextMarkdown, { hash })
    } catch (error) {
      logger.warn('Failed to navigate to workspace virtual file.', error)
      bridge?.showToast?.('Could not read linked file', { variant: 'error' })
    } finally {
      bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
    }

    await afterSuccessfulNavigation({ hash })
  }

  const navigateToFile = async (
    fileUrl,
    { replaceHistory = false, forceReload = false, hash = null, syncExplorer = true } = {}
  ) => {
    if (!fileUrl) return
    if (isWorkspaceVirtualHref(fileUrl)) {
      await navigateWorkspaceVirtualFile(fileUrl, { hash })
      return
    }

    const current = normalizeFileUrlForCompare(refs.currentFileUrlRef.current)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (!forceReload && current === target) return

    bridge?.getArticleEl?.()?.setAttribute('aria-busy', 'true')
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
        payload: { url: fileUrl }
      })
      if (!response?.ok) {
        const msg = /permission|denied|access/i.test(response?.error || '')
          ? 'Could not read linked file'
          : 'Could not open linked file'
        bridge?.showToast?.(msg, { variant: 'error' })
        return
      }
      const nextMarkdown = String(response.data?.text || '')
      if (!nextMarkdown.trim()) {
        bridge?.showToast?.('Linked file is empty', { variant: 'warning' })
        return
      }

      await renderNavigatedMarkdown(fileUrl, nextMarkdown, { hash, replaceHistory })
    } catch (error) {
      logger.warn('Failed to navigate to sibling markdown file.', error)
      bridge?.showToast?.('Could not open linked file', { variant: 'error' })
    } finally {
      bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
    }

    if (syncExplorer) {
      await afterSuccessfulNavigation({ hash })
    }
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
