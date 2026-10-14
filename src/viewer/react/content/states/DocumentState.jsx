import React from 'react'
import { LoadingState } from '../../../../shared/react/LoadingState.jsx'
import { SkeletonLine } from '../../../../shared/react/Skeleton.jsx'

export function DocumentState({ className, title, message, role = 'status', loading, skeleton, onRetry }) {
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
  if (loading) return <LoadingState className={className} label={message} />
  if (!title && !onRetry) return <div className={className} role={role}>{message}</div>

  return (
    <section className={className} role={role}>
      {title && <strong className="mdp-ui-state__title">{title}</strong>}
      {message && <p className="mdp-ui-state__message">{message}</p>}
      {onRetry && (
        <button type="button" className="mdp-ui-button mdp-ui-state__action" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

export function MermaidErrorState({ message, source }) {
  return (
    <>
      <div className="mdp-mermaid__error-banner">
        <div className="mdp-mermaid__error-title">Mermaid render error</div>
        <pre className="mdp-mermaid__error-message" role="alert">{message}</pre>
      </div>
      <div className="mdp-mermaid__source-title">Diagram source</div>
      <pre className="mdp-mermaid__source">{source}</pre>
    </>
  )
}

export function DocumentLabel({ text }) { return <>{text}</> }
