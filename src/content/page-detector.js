import { getTextSample, looksLikeMarkdownText } from './text-sampling.js'

export function detectMarkdownPage({ location, document }) {
  const reasons = []
  let score = 0
  const pathname = location?.pathname || ''
  const contentType = document?.contentType || ''
  const body = document?.body || null

  if (/\.(md|markdown|mdown)$/i.test(pathname)) {
    score += 5
    reasons.push('URL path ends with .md/.markdown/.mdown')
  }

  if (contentType.includes('text/plain')) {
    score += 1
    reasons.push('Document contentType is text/plain')
  }

  if (/(^|;)\s*text\/markdown/i.test(contentType) || /application\/markdown/i.test(contentType)) {
    score += 4
    reasons.push('Document contentType looks like markdown')
  }

  const preTags = document?.body?.querySelectorAll?.('pre') || []
  const preText = preTags.length === 1 ? String(preTags[0].textContent || '').trim() : ''
  if (preTags.length === 1) {
    if (preText.length > 100) {
      score += 1
      reasons.push('Single <pre> is large enough to consider')
    }

    if (looksLikeMarkdownText(preText)) {
      score += 4
      reasons.push('Single <pre> contains markdown-like tokens')
    } else if (preText.length > 400) {
      // Heuristic fallback: long text in a single <pre> is often raw markdown.
      score += 2
      reasons.push('Single <pre> long text (heuristic markdown fallback)')
    }
  }

  // Only scan the page text when we don't already have enough evidence.
  // This prevents heavy CPU/RAM spikes on every tab because the content script runs on `<all_urls>`.
  if (score < 3 && body) {
    const bodyTextSample = getTextSample(body, 20_000).trim()

    if ((bodyTextSample.match(/^#{1,6}\s+/gm) || []).length >= 2) {
      score += 2
      reasons.push('Contains multiple Markdown headings')
    }

    if ((bodyTextSample.match(/^```/gm) || []).length >= 2) {
      score += 2
      reasons.push('Contains fenced code blocks')
    }

    if ((bodyTextSample.match(/^(\-|\*|\+)\s+/gm) || []).length >= 3) {
      score += 1
      reasons.push('Contains multiple list markers')
    }
  }

  let confidence = 'low'
  if (score >= 6) confidence = 'high'
  else if (score >= 3) confidence = 'medium'

  let sourceType = 'unknown'
  if (/\.(md|markdown|mdown)$/i.test(pathname)) sourceType = 'url-extension'
  else if (preTags.length === 1) sourceType = 'raw-pre'
  else if (contentType.includes('text/plain')) sourceType = 'raw-text'

  return {
    isMarkdown: score >= 3,
    confidence,
    sourceType,
    reasons,
    score
  }
}
