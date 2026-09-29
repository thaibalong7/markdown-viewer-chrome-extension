import React, { useMemo } from 'react'
import { getDocumentStats } from '../../documents/document-stats.js'

function pluralizedCount(count, singular, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}

export function DocumentStats({ source = '' }) {
  const stats = useMemo(() => getDocumentStats(source), [source])
  if (stats.characterCount === 0) return null

  const wordsLabel = pluralizedCount(stats.wordCount, 'word')
  const charactersLabel = pluralizedCount(stats.characterCount, 'character')
  const readingLabel = `${stats.readingMinutes.toLocaleString()} min read`

  return (
    <aside
      className="mdp-document-stats"
      role="note"
      aria-label={`Document statistics: ${wordsLabel}, ${charactersLabel}, ${readingLabel}`}
    >
      <span aria-hidden="true">{wordsLabel}</span>
      <span className="mdp-document-stats__separator" aria-hidden="true">•</span>
      <span aria-hidden="true">{charactersLabel}</span>
      <span className="mdp-document-stats__separator" aria-hidden="true">•</span>
      <span className="mdp-document-stats__reading" aria-hidden="true">{readingLabel}</span>
    </aside>
  )
}
