import { t, translateMessage } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { LoadingState } from '../../../../shared/react/LoadingState.jsx'
import { SkeletonLine } from '../../../../shared/react/Skeleton.jsx'

export function DocumentState({ className, title, message, role = 'status', loading, skeleton, onRetry }) {
  useLocale()
  if (skeleton) {
    return (
      <div className="mdp-skeleton mdp-document-skeleton" aria-hidden="true">
        {['52%', '94%', '88%', '72%', '90%', '64%'].map((width, index) => (
          <SkeletonLine
            key={index}
            width={width}
            height={index === 0 ? 24 : 14}
            className={index === 0 ? 'mdp-document-skeleton__title' : ''}
          />
        ))}
      </div>
    )
  }
  if (loading) return <LoadingState className={className} label={translateMessage(message)} />
  if (!title && !onRetry) return <div className={className} role={role}>{translateMessage(message)}</div>

  return (
    <section className={className} role={role}>
      {title && <strong className="mdp-ui-state__title">{t(title)}</strong>}
      {message && <p className="mdp-ui-state__message">{translateMessage(message)}</p>}
      {onRetry && (
        <button type="button" className="mdp-ui-button mdp-ui-state__action" onClick={onRetry}>{t('common.actions.retry')}</button>
      )}
    </section>
  )
}

export function MermaidErrorState({ message, source }) {
  useLocale()
  return (
    <>
      <div className="mdp-mermaid__error-banner">
        <div className="mdp-mermaid__error-title">{t('viewer.documents.states.mermaidRenderError')}</div>
        <pre className="mdp-mermaid__error-message" role="alert">{translateMessage(message)}</pre>
      </div>
      <div className="mdp-mermaid__source-title">{t('viewer.documents.states.diagramSource')}</div>
      <pre className="mdp-mermaid__source">{source}</pre>
    </>
  )
}

export function DocumentLabel({ text }) { useLocale(); return <>{t(text)}</> }
