import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { MARKDOWN_PATHNAME_EXT_RE } from '../../shared/markdown-detect.js'
import { normalizeFileUrlForCompare } from '../explorer/url-utils.js'

function decodeHashFragment(value) {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function splitHrefHash(rawHref) {
  const value = String(rawHref || '')
  const hashIndex = value.indexOf('#')
  if (hashIndex < 0) return { hrefWithoutHash: value, hash: null }
  return {
    hrefWithoutHash: value.slice(0, hashIndex),
    hash: decodeHashFragment(value.slice(hashIndex + 1))
  }
}

function isUnsafeHref(href) {
  return /^(javascript|data|blob):/i.test(href)
}

function isExternalHref(href) {
  return /^(https?|mailto|tel):/i.test(href)
}

function hasUrlScheme(href) {
  return /^[a-z][a-z\d+.-]*:/i.test(href)
}

function isRelativeWorkspaceHref(href) {
  if (!href) return false
  if (href.startsWith('/') || href.startsWith('//')) return false
  return !hasUrlScheme(href)
}

function decodeVirtualWorkspacePath(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith(MDP_WS_FILE)) return ''
  try {
    return decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
  } catch {
    return ''
  }
}

function encodeVirtualWorkspacePath(pathname) {
  return `${MDP_WS_FILE}${encodeURIComponent(pathname)}`
}

function resolveVirtualWorkspaceRelativeHref(href, currentFileUrl) {
  const currentPath = decodeVirtualWorkspacePath(currentFileUrl)
  if (!currentPath) return null

  const encodedBasePath = currentPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  try {
    const fakeBase = new URL(`file:///${encodedBasePath}`)
    const resolved = new URL(href, fakeBase)
    const resolvedPath = resolved.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment)
        } catch {
          return segment
        }
      })
      .join('/')
    return {
      pathname: resolved.pathname,
      virtualHref: resolvedPath ? encodeVirtualWorkspacePath(resolvedPath) : null
    }
  } catch {
    return null
  }
}

/**
 * @param {string} rawHref
 * @param {{
 *   currentFileUrl?: string,
 *   virtualFileExists?: ((href: string) => boolean) | null
 * }} [context]
 * @returns {{
 *   kind: 'same-document-hash' | 'self-link' | 'markdown-file' | 'workspace-virtual-file' | 'external' | 'asset' | 'unsupported',
 *   resolvedUrl: string | null,
 *   hash: string | null,
 *   shouldIntercept: boolean
 * }}
 */
export function resolveMarkdownLink(rawHref, context = {}) {
  const href = String(rawHref || '').trim()
  const currentFileUrl = typeof context.currentFileUrl === 'string' ? context.currentFileUrl : ''
  const virtualFileExists =
    typeof context.virtualFileExists === 'function' ? context.virtualFileExists : () => false

  if (!href) {
    return { kind: 'unsupported', resolvedUrl: null, hash: null, shouldIntercept: false }
  }
  if (isUnsafeHref(href)) {
    return { kind: 'unsupported', resolvedUrl: null, hash: null, shouldIntercept: false }
  }
  if (href.startsWith('#')) {
    return {
      kind: 'same-document-hash',
      resolvedUrl: currentFileUrl || null,
      hash: decodeHashFragment(href.slice(1)),
      shouldIntercept: true
    }
  }
  if (isExternalHref(href)) {
    return { kind: 'external', resolvedUrl: null, hash: null, shouldIntercept: false }
  }

  const { hrefWithoutHash, hash } = splitHrefHash(href)

  if (hrefWithoutHash.startsWith(MDP_WS_FILE)) {
    if (!virtualFileExists(hrefWithoutHash)) {
      return { kind: 'unsupported', resolvedUrl: null, hash, shouldIntercept: false }
    }
    const currentNormalized = normalizeFileUrlForCompare(currentFileUrl)
    const targetNormalized = normalizeFileUrlForCompare(hrefWithoutHash)
    return {
      kind: currentNormalized && currentNormalized === targetNormalized ? 'self-link' : 'workspace-virtual-file',
      resolvedUrl: hrefWithoutHash,
      hash,
      shouldIntercept: true
    }
  }

  if (currentFileUrl.startsWith(MDP_WS_FILE) && isRelativeWorkspaceHref(hrefWithoutHash)) {
    const resolvedVirtual = resolveVirtualWorkspaceRelativeHref(hrefWithoutHash, currentFileUrl)
    if (!resolvedVirtual?.virtualHref) {
      return { kind: 'unsupported', resolvedUrl: null, hash, shouldIntercept: false }
    }
    if (!MARKDOWN_PATHNAME_EXT_RE.test(resolvedVirtual.pathname)) {
      return {
        kind: 'asset',
        resolvedUrl: resolvedVirtual.virtualHref,
        hash,
        shouldIntercept: false
      }
    }
    if (!virtualFileExists(resolvedVirtual.virtualHref)) {
      return { kind: 'unsupported', resolvedUrl: null, hash, shouldIntercept: false }
    }

    const currentNormalized = normalizeFileUrlForCompare(currentFileUrl)
    const targetNormalized = normalizeFileUrlForCompare(resolvedVirtual.virtualHref)
    return {
      kind: currentNormalized && currentNormalized === targetNormalized ? 'self-link' : 'workspace-virtual-file',
      resolvedUrl: resolvedVirtual.virtualHref,
      hash,
      shouldIntercept: true
    }
  }

  try {
    const resolved = currentFileUrl ? new URL(hrefWithoutHash, currentFileUrl) : new URL(hrefWithoutHash)
    if (resolved.protocol !== 'file:') {
      return { kind: 'unsupported', resolvedUrl: null, hash, shouldIntercept: false }
    }

    resolved.hash = ''
    resolved.search = ''
    const resolvedUrl = resolved.href
    if (!MARKDOWN_PATHNAME_EXT_RE.test(resolved.pathname)) {
      return { kind: 'asset', resolvedUrl, hash, shouldIntercept: false }
    }

    const currentNormalized = normalizeFileUrlForCompare(currentFileUrl)
    const targetNormalized = normalizeFileUrlForCompare(resolvedUrl)
    return {
      kind: currentNormalized && currentNormalized === targetNormalized ? 'self-link' : 'markdown-file',
      resolvedUrl,
      hash,
      shouldIntercept: true
    }
  } catch {
    return { kind: 'unsupported', resolvedUrl: null, hash, shouldIntercept: false }
  }
}
