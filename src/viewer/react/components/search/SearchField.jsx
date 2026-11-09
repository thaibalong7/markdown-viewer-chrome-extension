import React, { forwardRef } from 'react'
import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

/** Viewer-local flat field: one focus treatment and one explicit query-clear action. */
export const SearchField = forwardRef(function SearchField({ value, onChange, onCompositionChange, className = '', ...props }, ref) {
  useLocale()
  const inputRef = React.useRef(null)
  const setRef = React.useCallback((node) => {
    inputRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])
  return <div className={`mdp-search-field ${className}`}>
    <input {...props} ref={setRef} className="mdp-search__input" type="search" value={value} onChange={(event) => onChange(event.target.value)}
      onCompositionStart={() => onCompositionChange?.(true)}
      onCompositionEnd={event => { onChange(event.currentTarget.value); onCompositionChange?.(false) }} />
    {value ? <button type="button" className="mdp-search-field__clear" aria-label={t('viewer.search.clearQuery')}
      onClick={() => { onCompositionChange?.(false); onChange(''); inputRef.current?.focus({ preventScroll: true }) }}><AppIcon name="close" size={12} /></button> : null}
  </div>
})
