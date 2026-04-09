function getTextSample(root, maxChars = 20000) {
  if (!root) return ''

  const doc = root.ownerDocument
  const defaultView = doc?.defaultView
  const NodeFilterConst =
    defaultView?.NodeFilter ??
    (typeof NodeFilter !== 'undefined' ? NodeFilter : null)

  if (!doc || !NodeFilterConst) return ''

  // Use TreeWalker + early stop to avoid building huge `innerText` strings.
  const walker = doc.createTreeWalker(root, NodeFilterConst.SHOW_TEXT)
  let out = ''

  let node
  while ((node = walker.nextNode())) {
    const t = node?.nodeValue || ''
    // Skip whitespace-only nodes.
    if (!t.trim()) continue

    // Add a separator so regexes that rely on line starts keep working.
    if (out) out += '\n'
    out += t

    if (out.length >= maxChars) break
  }

  return out.slice(0, maxChars)
}

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

    const looksLikeMarkdown = (
      /^(#{1,6}\s+)/m.test(preText) ||
      /^```/m.test(preText) ||
      /^>\s+/m.test(preText) ||
      /^(\-|\*|\+)\s+/m.test(preText) ||
      /^\d+\.\s+/m.test(preText) ||
      /^(\s*[-*_]{3,}\s*)$/m.test(preText) ||
      /\*\*[^*]+\*\*/.test(preText) ||
      /\[[^\]]+\]\([^)]+\)/.test(preText)
    )

    if (looksLikeMarkdown) {
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
    const bodyTextSample = getTextSample(body, 20000).trim()

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
