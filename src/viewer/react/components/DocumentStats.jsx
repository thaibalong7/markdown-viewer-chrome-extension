import { formatNumber, t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useMemo } from 'react'
import { getDocumentStats } from '../../documents/document-stats.js'

export function DocumentStats({ source = '' }) {
  useLocale()
  const stats = useMemo(() => getDocumentStats(source), [source])
  if (stats.characterCount === 0) return null

  const wordsLabel = t('viewer.statistics.words', { count: stats.wordCount })
  const charactersLabel = t('viewer.statistics.characters', { count: stats.characterCount })
  const readingLabel = t('viewer.statistics.readingTime', { 0: formatNumber(stats.readingMinutes) })

  return (
    <aside
      className="mdp-document-stats"
      role="note"
      aria-label={t('viewer.statistics.summary', { 0: wordsLabel, 1: charactersLabel, 2: readingLabel })}
    >
      <span aria-hidden="true">{wordsLabel}</span>
      <span className="mdp-document-stats__separator" aria-hidden="true">•</span>
      <span aria-hidden="true">{charactersLabel}</span>
      <span className="mdp-document-stats__separator" aria-hidden="true">•</span>
      <span className="mdp-document-stats__reading" aria-hidden="true">{readingLabel}</span>
    </aside>
  )
}
