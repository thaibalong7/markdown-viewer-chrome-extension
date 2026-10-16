import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { lazy, Suspense, useCallback, useEffect, useId, useReducer, useRef } from 'react'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { ModalDialog } from './common/ModalDialog.jsx'
import { IconButton } from './common/IconButton.jsx'
import { ChangeReviewIcon } from './icons/ChangeReviewIcon.jsx'
import { reviewPairReducer } from '../../review/review-pair.js'

const ChangeReviewPanel = lazy(() => import('./ChangeReviewPanel.jsx'))

export function ChangeReviewLoadingFallback() {
  useLocale()
  return <span className="mdp-change-review__visually-hidden" role="status">{t('viewer.review.dialog.openingReview')}</span>
}

export function ChangeReviewErrorFallback({ onClose, triggerRef }) {
  useLocale()
  const closeRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  return <ModalDialog open initialFocusRef={closeRef} returnFocusRef={triggerRef}
    onDismiss={onClose} className="mdp-change-review-backdrop" data-mdp-watch-open="true"
    role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className="mdp-ui-card mdp-change-review-error">
      <div className="mdp-change-review-error__content">
        <Notice variant="danger">
          <strong id={titleId}>{t('errors.viewer.review.dialog.openReview')}</strong>
          <p id={descriptionId}>{t('viewer.review.dialog.reloadThisViewerAndTryAgain')}</p>
        </Notice>
      </div>
      <div className="mdp-ui-action-footer mdp-ui-action-footer--end mdp-change-review-error__actions">
        <Button ref={closeRef} onClick={onClose}>{t('viewer.review.dialog.closeReview')}</Button>
      </div>
    </div>
  </ModalDialog>
}

export class ReviewLoadBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <ChangeReviewErrorFallback onClose={this.props.onClose} triggerRef={this.props.triggerRef} /> : this.props.children
  }
}

export function ChangeReview({ state = {}, isEditMode, editorDirty, onApply, onCheck, onSectionNavigate, disabled = false, renderTrigger }) {
  useLocale()
  const [pair, dispatch] = useReducer(reviewPairReducer, null)
  const triggerRef = useRef(null)
  const close = useCallback(() => dispatch({ type: 'close' }), [])
  useEffect(() => {
    dispatch({ type: 'sync', available: state.available, generation: state.generation })
  }, [state.available, state.generation])
  const trigger = state.available && (state.reviewPair || pair) ? (
    <IconButton ref={triggerRef} className="mdp-fab-btn mdp-change-review-trigger" tooltip={t('common.actions.viewChanges')} aria-label={t('common.actions.viewChanges')}
      disabled={disabled || !state.reviewPair}
      onClick={() => dispatch({ type: 'open', candidate: state.reviewPair })} aria-haspopup="dialog" aria-expanded={Boolean(pair)}>
      <ChangeReviewIcon className="mdp-fab-btn__icon" />
    </IconButton>
  ) : null
  return <>
    {renderTrigger ? renderTrigger(trigger) : trigger}
    {pair && state.available && pair.generation === state.generation && <ReviewLoadBoundary onClose={close} triggerRef={triggerRef}><Suspense fallback={<ChangeReviewLoadingFallback />}>
      <ChangeReviewPanel pair={pair} candidate={state.latestReviewPair} acceptedSource={state.acceptedSource} isEditMode={isEditMode} editorDirty={editorDirty}
        triggerRef={triggerRef} onClose={close} onRefresh={() => dispatch({ type: 'refresh', candidate: state.latestReviewPair })} onApply={onApply}
        onSectionNavigate={onSectionNavigate} applying={state.manualChecking} onCheck={onCheck} canCheck={state.supported} watchError={state.error} />
    </Suspense></ReviewLoadBoundary>}
  </>
}
