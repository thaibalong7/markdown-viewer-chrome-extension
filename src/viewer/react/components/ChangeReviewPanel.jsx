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
  return <dl className="mdp-change-review__metrics" aria-label="Change summary">
    <div className="mdp-ui-card mdp-change-review__metric mdp-change-review__metric--added"><dt>Added</dt><dd>+{review.added}</dd></div>
    <div className="mdp-ui-card mdp-change-review__metric mdp-change-review__metric--removed"><dt>Removed</dt><dd>−{review.removed}</dd></div>
    <div className="mdp-ui-card mdp-change-review__metric"><dt>Areas</dt><dd>{review.hunks.length}</dd></div>
  </dl>
}

function AffectedSections({ sections, activeHunk, onJump, canNavigate, onSectionNavigate }) {
  if (!sections.length) return null
  return <nav className="mdp-change-review__sections" aria-label="Affected sections">
    <h3>Affected sections</h3>
    <ul>{sections.map((section) => <li key={section.key} className={section.hunk === activeHunk ? 'is-active' : ''}>
      <button type="button" className="mdp-change-review__section-jump" onClick={() => onJump(section.hunk)}>
        <span className="mdp-change-review__section-name">{section.title}</span>
        {section.removed
          ? <Badge variant="danger" className="mdp-change-review__deleted-badge">Deleted</Badge>
          : <span className="mdp-change-review__section-region">Area {section.hunk + 1}</span>}
      </button>
      {canNavigate && section.newLine !== null && <button type="button" className="mdp-change-review__section-open"
        aria-label={`Open in document: ${section.title}`} onClick={() => onSectionNavigate?.(section)}>Open document</button>}
    </li>)}</ul>
  </nav>
}

function DiffHunk({ hunk, active, registerHunk, onActivate }) {
  const added = hunk.rows.filter((row) => row.type === 'added').length
  const removed = hunk.rows.filter((row) => row.type === 'removed').length
  return <section ref={(node) => registerHunk(hunk.id, node)} tabIndex={0} onFocus={() => onActivate(hunk.id)} onClick={() => onActivate(hunk.id)}
    className={`mdp-ui-card mdp-change-review__hunk${active ? ' is-active' : ''}`} aria-label={`Changed area ${hunk.id + 1}`}>
    <div className="mdp-change-review__hunk-header"><span>Changed area {hunk.id + 1}</span><span>{added} added · {removed} removed</span></div>
    <table>
      <caption className="mdp-change-review__visually-hidden">Source lines in changed area {hunk.id + 1}</caption>
      <thead className="mdp-change-review__visually-hidden"><tr><th>Old line</th><th>New line</th><th>Change</th><th>Source</th></tr></thead>
      <tbody>{hunk.rows.map((row, index) => <tr key={index} className={`mdp-change-review__row--${row.type}`}>
        <td className="mdp-change-review__line-number" aria-label={row.oldLine == null ? 'No old line' : `Old line ${row.oldLine}`}>{row.oldLine ?? ''}</td>
        <td className="mdp-change-review__line-number" aria-label={row.newLine == null ? 'No new line' : `New line ${row.newLine}`}>{row.newLine ?? ''}</td>
        <td className="mdp-change-review__marker"><span aria-label={row.type}>{row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}</span></td>
        <td className="mdp-change-review__source"><code>{row.text || ' '}</code>{row.type !== 'equal' && row.ending !== 'LF' && <small> {row.ending}</small>}</td>
      </tr>)}</tbody>
    </table>
  </section>
}

export function ChangeReviewContent({ review, activeHunk, registerHunk, onJump, canNavigate, onSectionNavigate }) {
  if (!review) return <ReviewNotice>Calculating changes…</ReviewNotice>
  if (review.error) return <ReviewNotice role="alert">Could not calculate changes. Close this review and try again.</ReviewNotice>
  if (review.limited) return <ReviewNotice>Detailed review is unavailable because this comparison exceeds the size, time or output limit. Use your editor’s diff tools for this file. Your document and draft are kept.</ReviewNotice>
  if (!review.hunks.length) return <ReviewNotice>No source changes in this comparison.</ReviewNotice>
  return <div className="mdp-change-review__workspace">
    <aside className="mdp-change-review__overview">
      <ChangeMetrics review={review} />
      <AffectedSections sections={review.sections} activeHunk={activeHunk} onJump={onJump}
        canNavigate={canNavigate} onSectionNavigate={onSectionNavigate} />
      <p className="mdp-change-review__shortcut"><kbd>Alt</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd> moves between changed areas in this comparison</p>
    </aside>
    <main className="mdp-change-review__main">
      <nav className="mdp-change-review__navigation" aria-label="Changed area navigation">
        <div><span>Changed areas in this comparison</span><strong>Area {activeHunk + 1} of {review.hunks.length}</strong></div>
        <div className="mdp-change-review__navigation-buttons">
          <Button variant="secondary" disabled={activeHunk <= 0} aria-label="Previous changed area" onClick={() => onJump(activeHunk - 1)}>← Previous area</Button>
          <Button variant="secondary" disabled={activeHunk >= review.hunks.length - 1} aria-label="Next changed area" onClick={() => onJump(activeHunk + 1)}>Next area →</Button>
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
      try { setCalculation({ pair, review: buildChangeReview(pair.before, pair.after) }) }
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
          <div><h2 id={titleId}>Review changes</h2><Badge variant={reviewState === 'pending' ? 'warning' : 'success'} className="mdp-change-review__state">{reviewState === 'pending' ? 'Update waiting' : 'Last update'}</Badge></div>
          <p>{reviewState === 'pending' ? 'See what changed on disk before updating this document.' : 'Changes applied in the most recent document update.'}</p>
        </div>
        <div className="mdp-change-review__top-actions">
          {canCheck && <Button variant="quiet" disabled={applying} onClick={onCheck}>Check latest</Button>}
          {candidate?.kind === 'pending' && <Button ref={applyButtonRef} variant="primary" disabled={applying} onClick={requestApply}>{isEditMode ? 'Load disk version…' : 'Update document'}</Button>}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </header>
      <div className="mdp-change-review__messages">
        {isEditMode && candidate?.kind === 'pending' && <EditorUpdateWarning dirty={editorDirty} />}
        {isEditMode && <div className="mdp-ui-status mdp-ui-status--info mdp-change-review__source-note"><span className="mdp-ui-status__dot" aria-hidden="true" />Your editor draft is excluded from this comparison.</div>}
        {watchError && <Notice variant="danger" title="Update check failed" className="mdp-change-review__message" role="alert">{watchError}</Notice>}
        {changed && <Notice variant="warning" className="mdp-change-review__newer" role="status">
          <span>{candidate ? 'A newer comparison is ready.' : 'This comparison is no longer current.'}</span>
          {candidate && <Button variant="secondary" onClick={onRefresh}>Review latest</Button>}
        </Notice>}
        {acceptedSource !== pair.after && <div className="mdp-ui-status mdp-ui-status--info mdp-change-review__source-note"><span className="mdp-ui-status__dot" aria-hidden="true" />The reviewed version is not open yet. Update the document to enable section links.</div>}
      </div>
      <ChangeReviewContent review={review} activeHunk={activeHunk} registerHunk={registerHunk} onJump={jump} canNavigate={canNavigate} onSectionNavigate={(section) => {
        if (onSectionNavigate?.(pair, section)) onClose()
      }} />
    </section>
  </ModalDialog>
  <EditorUpdateConfirmation open={confirmingApply} dirty={editorDirty} busy={applying}
    returnFocusRef={applyButtonRef} onCancel={() => setConfirmingApply(false)} onConfirm={confirmApply} /></>
}
