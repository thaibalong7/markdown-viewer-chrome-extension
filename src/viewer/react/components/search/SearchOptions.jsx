import React from 'react'
import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import { IconButton } from '../common/IconButton.jsx'
import { useSearch } from '../../contexts/SearchContext.jsx'

const MODES = [
  ['caseSensitive', 'Aa', 'viewer.search.matchCase'],
  ['wholeWord', 'ab', 'viewer.search.wholeWord'],
  ['diacriticSensitive', 'Á', 'viewer.search.matchDiacritics']
]

export function SearchOptions() {
  useLocale()
  const { options, toggleOption } = useSearch()
  return <div className="mdp-search-options" role="group" aria-label={t('viewer.search.matchOptions')}>
    {MODES.map(([name, glyph, label]) => <IconButton key={name} className={`mdp-search-options__button mdp-search-options__${name}`}
      aria-label={t(label)} tooltip={t(label)} pressed={options[name]} onClick={() => toggleOption(name)}>
      <span aria-hidden="true">{glyph}</span>
    </IconButton>)}
  </div>
}
