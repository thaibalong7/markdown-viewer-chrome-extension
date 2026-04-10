import { getTextSample } from './text-sampling.js'

const SAMPLE_MAX_CHARS = 50_000
const FULL_MAX_CHARS = 500_000

function normalizeMarkdown(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u2028|\u2029/g, '\n') // LS / PS → LF for markdown-it soft breaks
}

export function extractRawMarkdown(document, { mode = 'full', maxChars } = {}) {
  const warnings = []
  const body = document?.body
  const resolvedMaxChars = Number.isFinite(maxChars)
    ? maxChars
    : (mode === 'sample' ? SAMPLE_MAX_CHARS : FULL_MAX_CHARS)

  if (!body) {
    return {
      markdown: '',
      extractionMethod: 'none',
      warnings: ['Missing document body.']
    }
  }

  const preTags = body.querySelectorAll('pre')
  if (preTags.length === 1) {
    return {
      markdown: normalizeMarkdown(preTags[0].textContent),
      extractionMethod: 'single-pre',
      warnings
    }
  }

  const textSource = getTextSample(body, resolvedMaxChars)

  const text = normalizeMarkdown(textSource)
  const truncated = textSource.length >= resolvedMaxChars
  if (truncated) {
    warnings.push(`Markdown content was truncated to ${resolvedMaxChars} chars.`)
  }

  if (text) {
    return {
      markdown: text,
      extractionMethod: mode === 'sample' ? 'body-textSample' : 'body-textSample-capped',
      warnings,
      truncated
    }
  }

  warnings.push('Unable to extract markdown from page.')
  return {
    markdown: '',
    extractionMethod: 'none',
    warnings
  }
}
