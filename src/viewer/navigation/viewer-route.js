import { getFileTypeFromUrl } from '../../shared/file-types.js'
import { hashTargetToUrlFragment } from '../scroll-utils.js'

export const VIEWER_FILE_QUERY_PARAM = 'f'

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeRealFileUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'file:') return null
    url.search = ''
    url.hash = ''
    return getFileTypeFromUrl(url) ? url.href : null
  } catch {
    return null
  }
}

function filePathSegments(url) {
  return url.pathname.split('/').map(decodeUrlPart)
}

function relativeFileReference(entryFileUrl, targetFileUrl) {
  const entry = new URL(entryFileUrl)
  const target = new URL(targetFileUrl)
  if (entry.protocol !== target.protocol || entry.host !== target.host) {
    return target.href
  }

  const from = filePathSegments(entry)
  const to = filePathSegments(target)
  from.pop()

  let common = 0
  while (common < from.length && common < to.length && from[common] === to[common]) {
    common += 1
  }

  return [
    ...Array(Math.max(0, from.length - common)).fill('..'),
    ...to.slice(common)
  ].join('/')
}

function encodeReadableFileReference(value) {
  return encodeURIComponent(value)
    .replace(/%2F/gi, '/')
    .replace(/%3A/gi, ':')
}

function decodeHeading(hash) {
  if (!hash) return null
  return decodeUrlPart(hash.replace(/^#/, '')) || null
}

/**
 * Parse the browser URL into the stable entry document plus the logical document route.
 * Only registered real `file:` documents are restorable through `?f=`.
 */
export function parseViewerRoute(locationHref) {
  try {
    const locationUrl = new URL(locationHref)
    if (locationUrl.protocol !== 'file:') return null

    const rawTarget = locationUrl.searchParams.get(VIEWER_FILE_QUERY_PARAM)
    const hash = decodeHeading(locationUrl.hash)
    locationUrl.searchParams.delete(VIEWER_FILE_QUERY_PARAM)
    locationUrl.hash = ''
    const entryFileUrl = normalizeRealFileUrl(locationUrl.href)
    if (!entryFileUrl) return null

    if (!rawTarget) {
      return {
        entryFileUrl,
        targetFileUrl: entryFileUrl,
        hash,
        hasFileTarget: false,
        invalidFileTarget: false
      }
    }

    const encodedTarget = encodeReadableFileReference(rawTarget)
    const targetFileUrl = normalizeRealFileUrl(new URL(encodedTarget, entryFileUrl).href)
    if (!targetFileUrl) {
      return {
        entryFileUrl,
        targetFileUrl: entryFileUrl,
        hash: null,
        hasFileTarget: false,
        invalidFileTarget: true
      }
    }

    return {
      entryFileUrl,
      targetFileUrl,
      hash,
      hasFileTarget: targetFileUrl !== entryFileUrl,
      invalidFileTarget: false
    }
  } catch {
    return null
  }
}

/** Build `entry.md?f=relative/file.md#heading` without mutating browser history. */
export function buildViewerRouteUrl({ entryFileUrl, currentFileUrl, hash = null }) {
  const entry = normalizeRealFileUrl(entryFileUrl)
  const current = normalizeRealFileUrl(currentFileUrl)
  if (!entry || !current) return null

  const routeUrl = new URL(entry)
  if (current !== entry) {
    const reference = relativeFileReference(entry, current)
    routeUrl.search = `?${VIEWER_FILE_QUERY_PARAM}=${encodeReadableFileReference(reference)}`
  }
  routeUrl.hash = hash ? hashTargetToUrlFragment(hash) : ''
  return routeUrl.href
}

export function writeViewerRoute({
  entryFileUrl,
  currentFileUrl,
  hash = null,
  replace = false,
  history = globalThis.window?.history
}) {
  const href = buildViewerRouteUrl({ entryFileUrl, currentFileUrl, hash })
  if (!href || !history) return null
  if (replace) history.replaceState(null, '', href)
  else history.pushState(null, '', href)
  return href
}

/** Build a directly openable section URL without changing browser history. */
export function buildDirectFileSectionUrl(fileUrl, hash = null) {
  const normalized = normalizeRealFileUrl(fileUrl)
  if (!normalized) return null
  const url = new URL(normalized)
  url.hash = hash ? hashTargetToUrlFragment(hash) : ''
  return url.href
}
