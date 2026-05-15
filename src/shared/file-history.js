import { pathnameHasMarkdownExtension } from './markdown-detect.js'

export const MAX_FILE_HISTORY_ENTRIES = 12

export function normalizeFileHistoryUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'file:') return null
    parsed.hash = ''
    parsed.search = ''
    if (!pathnameHasMarkdownExtension(parsed.pathname)) return null
    return parsed.href
  } catch {
    return null
  }
}

export function fileHistoryTitleFromUrl(rawUrl) {
  const normalized = normalizeFileHistoryUrl(rawUrl)
  if (!normalized) return 'Markdown file'
  try {
    const parsed = new URL(normalized)
    const rawLeaf = parsed.pathname.split('/').filter(Boolean).pop() || normalized
    return decodeURIComponent(rawLeaf)
  } catch {
    return 'Markdown file'
  }
}

export function fileHistoryDirectoryFromUrl(rawUrl) {
  const normalized = normalizeFileHistoryUrl(rawUrl)
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    const segments = parsed.pathname.split('/').filter(Boolean)
    segments.pop()
    const path = `/${segments.map((segment) => decodeURIComponent(segment)).join('/')}`
    return path === '/' ? '/' : path
  } catch {
    return ''
  }
}

export function upsertFileHistoryEntry(entries, entry, limit = MAX_FILE_HISTORY_ENTRIES) {
  const normalizedUrl = normalizeFileHistoryUrl(entry?.url)
  if (!normalizedUrl) return Array.isArray(entries) ? entries : []

  const openedAt = Number.isFinite(Number(entry?.openedAt)) ? Number(entry.openedAt) : Date.now()
  const title =
    typeof entry?.title === 'string' && entry.title.trim()
      ? entry.title.trim()
      : fileHistoryTitleFromUrl(normalizedUrl)

  const nextEntry = {
    url: normalizedUrl,
    title,
    openedAt
  }

  const existing = Array.isArray(entries) ? entries : []
  const deduped = existing.filter((item) => normalizeFileHistoryUrl(item?.url) !== normalizedUrl)
  return [nextEntry, ...deduped]
    .filter((item) => normalizeFileHistoryUrl(item?.url))
    .slice(0, Math.max(1, Number(limit) || MAX_FILE_HISTORY_ENTRIES))
}
