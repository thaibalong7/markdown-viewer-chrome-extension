import { t, translateMessage } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useEffect, useId, useRef, useState } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { buildChangeReview } from '../../review/change-review.js'
import { reviewPairChanged } from '../../review/review-pair.js'
import { getReviewKeyboardAction, useReviewNavigation } from '../hooks/useReviewNavigation.js'
import { ModalDialog } from './common/ModalDialog.jsx'
import { EditorUpdateConfirmation, EditorUpdateWarning } from './EditorUpdateConfirmation.jsx'

function ReviewNotice({ role = 'status', children }) {
  return <div className={`mdp-ui-state mdp-change-review__notice${role === 'alert' ? ' mdp-ui-state--error' : ''}`} role={role}>{children}</div>
}

function ChangeMetrics({ review }) {
  useLocale()
  return <dl className="mdp-change-review__metrics" aria-label={t('viewer.review.changeSummary')}>
    <div className="mdp-ui-card mdp-change-review__metric mdp-change-review__metric--added"><dt>{t('viewer.review.added')}</dt><dd>+{review.added}</dd></div>
    <div className="mdp-ui-card mdp-change-review__metric mdp-change-review__metric--removed"><dt>{t('viewer.review.removed')}</dt><dd>−{review.removed}</dd></div>
    <div className="mdp-ui-card mdp-change-review__metric"><dt>{t('viewer.review.areas')}</dt><dd>{review.hunks.length}</dd></div>
  </dl>
}

function AffectedSections({ sections, activeHunk, onJump, canNavigate, onSectionNavigate }) {
  useLocale()
  if (!sections.length) return null
  return <nav className="mdp-change-review__sections" aria-label={t('viewer.review.affectedSections')}>
    <h3>{t('viewer.review.affectedSections')}</h3>
    <ul>{sections.map((section) => <li key={section.key} className={section.hunk === activeHunk ? 'is-active' : ''}>
      <button type="button" className="mdp-change-review__section-jump" onClick={() => onJump(section.hunk)}>
        <span className="mdp-change-review__section-name">{section.key === 'preamble' ? t('viewer.review.beforeTheFirstHeading') : section.title}</span>
        {section.removed ? <Badge variant="danger" className="mdp-change-review__deleted-badge">{t('viewer.review.deleted')}</Badge> : <span className="mdp-change-review__section-region">{t('viewer.review.area')}{' '}{section.hunk + 1}</span>}
      </button>
      {canNavigate && section.newLine !== null && <button type="button" className="mdp-change-review__section-open"
        aria-label={t('viewer.review.openInDocumentValue', { 0: section.key === 'preamble' ? t('viewer.review.beforeTheFirstHeading') : section.title })} onClick={() => onSectionNavigate?.(section)}>{t('viewer.review.openDocument')}</button>}
    </li>)}</ul>
  </nav>
}

function DiffHunk({ hunk, active, registerHunk, onActivate }) {
  useLocale()
  const added = hunk.rows.filter((row) => row.type === 'added').length
  const removed = hunk.rows.filter((row) => row.type === 'removed').length
  return <section ref={(node) => registerHunk(hunk.id, node)} tabIndex={0} onFocus={() => onActivate(hunk.id)} onClick={() => onActivate(hunk.id)}
    className={`mdp-ui-card mdp-change-review__hunk${active ? ' is-active' : ''}`} aria-label={t('viewer.review.changedAreaValue', { 0: hunk.id + 1 })}>
    <div className="mdp-change-review__hunk-header"><span>{t('viewer.review.changedArea')}{' '}{hunk.id + 1}</span><span>{added}{' '}{t('viewer.review.added2')}{' '}{removed}{' '}{t('viewer.review.removed2')}</span></div>
    <table>
      <caption className="mdp-change-review__visually-hidden">{t('viewer.review.sourceLinesInChangedArea')}{' '}{hunk.id + 1}</caption>
      <thead className="mdp-change-review__visually-hidden"><tr><th>{t('viewer.review.oldLine')}</th><th>{t('viewer.review.newLine')}</th><th>{t('viewer.review.change')}</th><th>{t('viewer.review.source')}</th></tr></thead>
      <tbody>{hunk.rows.map((row, index) => <tr key={index} className={`mdp-change-review__row--${row.type}`}>
        <td className="mdp-change-review__line-number" aria-label={row.oldLine == null ? t('viewer.review.noOldLine') : t('viewer.review.oldLineValue', { 0: row.oldLine })}>{row.oldLine ?? ''}</td>
        <td className="mdp-change-review__line-number" aria-label={row.newLine == null ? t('viewer.review.noNewLine') : t('viewer.review.newLineValue', { 0: row.newLine })}>{row.newLine ?? ''}</td>
        <td className="mdp-change-review__marker"><span aria-label={row.type}>{row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}</span></td>
        <td className="mdp-change-review__source"><code>{row.text || ' '}</code>{row.type !== 'equal' && row.ending !== 'LF' && <small> {row.ending === 'No newline at end of file' ? t('viewer.lineDiff.noNewlineAtEndOfFile') : row.ending}</small>}</td>
      </tr>)}</tbody>
    </table>
  </section>
}

export function ChangeReviewContent({ review, activeHunk, registerHunk, onJump, canNavigate, onSectionNavigate }) {
  useLocale()
  if (!review) return <ReviewNotice>{t('viewer.review.calculatingChanges')}</ReviewNotice>
  if (review.error) return <ReviewNotice role="alert">{t('errors.viewer.review.calculateChangesCloseThisReviewAndTryAgain')}</ReviewNotice>
  if (review.limited) return <ReviewNotice>{t('viewer.review.detailedReviewIsUnavailableBecauseThisComparisonExceeds')}</ReviewNotice>
  if (!review.hunks.length) return <ReviewNotice>{t('viewer.review.noSourceChangesInThisComparison')}</ReviewNotice>
  return <div className="mdp-change-review__workspace">
    <aside className="mdp-change-review__overview">
      <ChangeMetrics review={review} />
      <AffectedSections sections={review.sections} activeHunk={activeHunk} onJump={onJump}
        canNavigate={canNavigate} onSectionNavigate={onSectionNavigate} />
      <p className="mdp-change-review__shortcut"><kbd>{t('viewer.review.alt')}</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd>{' '}{t('viewer.review.movesBetweenChangedAreasInThisComparison')}</p>
    </aside>
    <main className="mdp-change-review__main">
      <nav className="mdp-change-review__navigation" aria-label={t('viewer.review.changedAreaNavigation')}>
        <div><span>{t('viewer.review.changedAreasInThisComparison')}</span><strong>{t('viewer.review.area')}{' '}{activeHunk + 1}{' '}{t('viewer.review.of')}{' '}{review.hunks.length}</strong></div>
        <div className="mdp-change-review__navigation-buttons">
          <Button variant="secondary" disabled={activeHunk <= 0} aria-label={t('viewer.review.previousChangedArea')} onClick={() => onJump(activeHunk - 1)}>{t('viewer.review.previousArea')}</Button>
          <Button variant="secondary" disabled={activeHunk >= review.hunks.length - 1} aria-label={t('viewer.review.nextChangedArea')} onClick={() => onJump(activeHunk + 1)}>{t('viewer.review.nextArea')}</Button>
        </div>
      </nav>
      <div className="mdp-change-review__diff">
        {review.hunks.map((hunk) => <DiffHunk key={hunk.id} hunk={hunk} active={hunk.id === activeHunk}
          registerHunk={registerHunk} onActivate={(id) => onJump(id, { focus: false })} />)}
      </div>
    </main>
  </div>
}

export default function ChangeReviewPanel({ pair, candidate, acceptedSource, isEditMode, editorDirty, triggerRef, onClose, onRefresh, onApply, onCheck, onSectionNavigate, applying, canCheck, watchError }) {
  useLocale()
  const dialogRef = useRef(null)
  const applyButtonRef = useRef(null)
  const titleId = useId()
  const [calculation, setCalculation] = useState(null)
  const review = calculation?.pair === pair ? calculation.review : null
  const [activeHunk, setActiveHunk] = useState(0)
  const [confirmingApply, setConfirmingApply] = useState(false)
  const { registerHunk, focusHunk } = useReviewNavigation()
  useEffect(() => {
    setActiveHunk(0)
    const timer = setTimeout(() => {
      try { setCalculation({ pair, review: buildChangeReview(pair.before, pair.after, { fileTypeId: pair.fileTypeId }) }) }
      catch { setCalculation({ pair, review: { error: true } }) }
    }, 0)
    return () => clearTimeout(timer)
  }, [pair])
  useEffect(() => {
    if (!isEditMode || candidate?.kind !== 'pending') setConfirmingApply(false)
  }, [candidate, isEditMode])
  const changed = reviewPairChanged(pair, candidate, acceptedSource)
  const canNavigate = !isEditMode && acceptedSource === pair.after
  const reviewState = acceptedSource === pair.after ? 'applied' : pair.kind
  const jump = (index, { focus = true } = {}) => {
    if (!review?.hunks?.length) return
    const next = Math.max(0, Math.min(review.hunks.length - 1, index))
    setActiveHunk(next)
    if (focus) focusHunk(next)
  }
  const requestApply = () => {
    if (isEditMode) setConfirmingApply(true)
    else onApply?.()
  }
  const confirmApply = () => {
    setConfirmingApply(false)
    onApply?.({ editorExitConfirmed: true })
  }
  return <>
  <ModalDialog open initialFocusRef={dialogRef} returnFocusRef={triggerRef}
    onDismiss={onClose} className="mdp-change-review-backdrop" data-mdp-watch-open="true" aria-labelledby={titleId}>
    <section ref={dialogRef} className="mdp-ui-card mdp-change-review" tabIndex={-1} onKeyDown={(event) => {
      const action = getReviewKeyboardAction(event)
      if (!action) return
      event.preventDefault()
      jump(activeHunk + (action === 'next' ? 1 : -1))
    }}>
      <header className="mdp-change-review__topbar">
        <div className="mdp-change-review__title">
          <div><h2 id={titleId}>{t('viewer.review.reviewChanges')}</h2><Badge variant={reviewState === 'pending' ? 'warning' : 'success'} className="mdp-change-review__state">{reviewState === 'pending' ? t('viewer.review.updateWaiting') : t('viewer.review.lastUpdate')}</Badge></div>
          <p>{reviewState === 'pending' ? t('viewer.review.seeWhatChangedOnDiskBeforeUpdatingThis') : t('viewer.review.changesAppliedInTheMostRecentDocumentUpdate')}</p>
        </div>
        <div className="mdp-change-review__top-actions">
          {canCheck && <Button variant="quiet" disabled={applying} onClick={onCheck}>{t('viewer.review.checkLatest')}</Button>}
          {candidate?.kind === 'pending' && <Button ref={applyButtonRef} variant="primary" disabled={applying} onClick={requestApply}>{isEditMode ? t('viewer.review.loadDiskVersion') : t('viewer.review.updateDocument')}</Button>}
          <Button variant="secondary" onClick={onClose}>{t('common.actions.close')}</Button>
        </div>
      </header>
      <div className="mdp-change-review__messages">
        {isEditMode && candidate?.kind === 'pending' && <EditorUpdateWarning dirty={editorDirty} />}
        {isEditMode && <div className="mdp-ui-status mdp-ui-status--info mdp-change-review__source-note"><span className="mdp-ui-status__dot" aria-hidden="true" />{t('viewer.review.yourEditorDraftIsExcludedFromThisComparison')}</div>}
        {watchError && <Notice variant="danger" title={t('viewer.review.updateCheckFailed')} className="mdp-change-review__message" role="alert">{translateMessage(watchError)}</Notice>}
        {changed && <Notice variant="warning" className="mdp-change-review__newer" role="status">
          <span>{candidate ? t('viewer.review.aNewerComparisonIsReady') : t('viewer.review.comparisonIsNoLongerCurrent')}</span>
          {candidate && <Button variant="secondary" onClick={onRefresh}>{t('viewer.review.reviewLatest')}</Button>}
        </Notice>}
        {acceptedSource !== pair.after && <div className="mdp-ui-status mdp-ui-status--info mdp-change-review__source-note"><span className="mdp-ui-status__dot" aria-hidden="true" />{t('viewer.review.reviewedVersionIsNotOpenYetUpdateThe')}</div>}
      </div>
      <ChangeReviewContent review={review} activeHunk={activeHunk} registerHunk={registerHunk} onJump={jump} canNavigate={canNavigate} onSectionNavigate={(section) => {
        if (onSectionNavigate?.(pair, section)) onClose()
      }} />
    </section>
  </ModalDialog>
  <EditorUpdateConfirmation open={confirmingApply} dirty={editorDirty} busy={applying}
    returnFocusRef={applyButtonRef} onCancel={() => setConfirmingApply(false)} onConfirm={confirmApply} /></>
}
