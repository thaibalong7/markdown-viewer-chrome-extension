import { logger } from '../../shared/logger.js'
import { getFileTypeFromUrl } from '../../shared/file-types.js'
import { normalizeFileUrlForCompare, normalizeDirectoryUrl } from '../explorer/url-utils.js'

const STORAGE_KEY = 'mdp:readingPositions'

function normalizeBookmark(value) {
  if (!value || !['top', 'ratio', 'offset', 'headingIndex'].every((key) => Number.isFinite(value[key]))) return null
  if (value.top < 0 || value.ratio < 0 || value.ratio > 1) return null
  return {
    top: value.top,
    ratio: value.ratio,
    offset: value.offset,
    headingIndex: value.headingIndex,
    headingId: typeof value.headingId === 'string' ? value.headingId : null,
    headingText: typeof value.headingText === 'string' ? value.headingText : ''
  }
}

/** Data-only bookmarks for one active session; null scope denotes a virtual workspace. */
export function createReadingPositionStore({
  entryFileUrl,
  workspaceRoot,
  getStorage = () => globalThis.sessionStorage
}) {
  const entry = normalizeFileUrlForCompare(entryFileUrl)
  const folderScope = `folder:${entry}`
  const workspaceScope = (root) => `workspace:${normalizeDirectoryUrl(root)}`
  let scope = workspaceRoot ? workspaceScope(workspaceRoot) : folderScope
  const positions = new Map()
  let reloadHref = null
  let storageUnavailable = false

  function persist() {
    try {
      const storage = getStorage()
      // Clearing a session must still remove stale data after a quota/write failure.
      if (scope === null || positions.size === 0) {
        storage?.removeItem(STORAGE_KEY)
      } else if (!storageUnavailable) {
        storage?.setItem(STORAGE_KEY, JSON.stringify({
          entry, scope, currentFile: reloadHref,
          positions: [...positions].filter(([href]) => href.startsWith('file:'))
        }))
      }
    } catch (error) {
      if (!storageUnavailable) logger.debug('Reading positions will remain in Viewer memory.', error)
      storageUnavailable = true
    }
  }

  try {
    const saved = JSON.parse(getStorage()?.getItem(STORAGE_KEY) || 'null')
    if (saved?.entry === entry && saved.scope === scope && Array.isArray(saved.positions)) {
      for (const item of saved.positions) {
        if (!Array.isArray(item)) continue
        const [href, value] = item
        const position = normalizeBookmark(value)
        if (typeof href === 'string' && href.startsWith('file:') && getFileTypeFromUrl(href) && position) {
          positions.set(normalizeFileUrlForCompare(href), position)
        }
      }
      if (positions.has(saved.currentFile)) reloadHref = saved.currentFile
    }
  } catch (error) {
    logger.debug('Could not restore reading positions for this tab.', error)
  }

  function changeScope(nextScope) {
    if (nextScope !== null && nextScope === scope) return false
    scope = nextScope
    positions.clear()
    reloadHref = null
    persist()
    return true
  }

  return {
    get: (href) => positions.get(normalizeFileUrlForCompare(href)),
    getReloadHref: () => reloadHref,
    save(href, value) {
      const position = normalizeBookmark(value)
      if (!position) return
      const key = normalizeFileUrlForCompare(href)
      const previous = positions.get(key)
      const nextReloadHref = key.startsWith('file:') ? key : null
      if (reloadHref === nextReloadHref && previous &&
        Object.entries(position).every(([field, value]) => previous[field] === value)) return
      positions.set(key, position)
      reloadHref = nextReloadHref
      persist()
    },
    startWorkspace: (root) => changeScope(root ? workspaceScope(root) : null),
    leaveWorkspace: () => changeScope(folderScope),
    dispose: () => positions.clear()
  }
}
