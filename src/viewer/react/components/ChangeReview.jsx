import React, { lazy, Suspense, useCallback, useEffect, useReducer, useRef } from 'react'
import { Button } from '../../../shared/react/Button.jsx'
import { IconButton } from './common/IconButton.jsx'
import { ChangeReviewIcon } from './icons/ChangeReviewIcon.jsx'
import { reviewPairReducer } from '../../review/review-pair.js'

const ChangeReviewPanel = lazy(() => import('./ChangeReviewPanel.jsx'))

export function ChangeReviewLoadingFallback() {
  return <span className="mdp-change-review__visually-hidden" role="status">Opening review…</span>
}

class ReviewLoadBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <span role="alert">Could not open review. Reload this viewer and try again. <Button onClick={this.props.onClose}>Close review</Button></span> : this.props.children
  }
}

export function ChangeReview({ state = {}, isEditMode, editorDirty, onApply, onCheck, onSectionNavigate, disabled = false, renderTrigger }) {
  const [pair, dispatch] = useReducer(reviewPairReducer, null)
  const triggerRef = useRef(null)
  const close = useCallback(() => dispatch({ type: 'close' }), [])
  useEffect(() => {
    dispatch({ type: 'sync', available: state.available, generation: state.generation })
  }, [state.available, state.generation])
  const trigger = state.available && (state.reviewPair || pair) ? (
    <IconButton ref={triggerRef} className="mdp-fab-btn mdp-change-review-trigger" tooltip="View changes" aria-label="View changes"
      disabled={disabled || !state.reviewPair}
      onClick={() => dispatch({ type: 'open', candidate: state.reviewPair })} aria-haspopup="dialog" aria-expanded={Boolean(pair)}>
      <ChangeReviewIcon className="mdp-fab-btn__icon" />
    </IconButton>
  ) : null
  return <>
    {renderTrigger ? renderTrigger(trigger) : trigger}
    {pair && state.available && pair.generation === state.generation && <ReviewLoadBoundary onClose={close}><Suspense fallback={<ChangeReviewLoadingFallback />}>
      <ChangeReviewPanel pair={pair} candidate={state.latestReviewPair} acceptedSource={state.acceptedSource} isEditMode={isEditMode} editorDirty={editorDirty}
        triggerRef={triggerRef} onClose={close} onRefresh={() => dispatch({ type: 'refresh', candidate: state.latestReviewPair })} onApply={onApply}
        onSectionNavigate={onSectionNavigate} applying={state.manualChecking} onCheck={onCheck} canCheck={state.supported} watchError={state.error} />
    </Suspense></ReviewLoadBoundary>}
  </>
}
