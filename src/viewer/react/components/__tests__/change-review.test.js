import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ChangeReview, ChangeReviewLoadingFallback, ReviewLoadBoundary } from '../ChangeReview.jsx'
import ChangeReviewPanel, { ChangeReviewContent } from '../ChangeReviewPanel.jsx'
import { EditorUpdateConfirmation, EditorUpdateWarning, getEditorUpdateCopy } from '../EditorUpdateConfirmation.jsx'
import { buildChangeReview } from '../../../review/change-review.js'
import { getReviewKeyboardAction } from '../../hooks/useReviewNavigation.js'

it('offers a review action only when a comparison exists', () => {
  const render = (state) => renderToStaticMarkup(React.createElement(ChangeReview, { state }))
  expect(render({ available: true })).toBe('')
  expect(render({ available: false, reviewPair: {} })).toBe('')
  expect(render({ available: true, reviewPair: {} })).toContain('aria-label="View changes"')
})

it('keeps the lazy loading announcement out of the visible action toolbar', () => {
  const html = renderToStaticMarkup(React.createElement(ChangeReviewLoadingFallback))
  expect(html).toContain('role="status"')
  expect(html).toContain('mdp-change-review__visually-hidden')
  expect(html).toContain('Opening review…')
})

it('contains review load failures in an accessible modal instead of the action toolbar', () => {
  const onClose = vi.fn()
  const triggerRef = { current: null }
  const boundary = new ReviewLoadBoundary({ onClose, triggerRef, children: 'Review content' })
  expect(boundary.render()).toBe('Review content')
  boundary.state = ReviewLoadBoundary.getDerivedStateFromError(new Error('Failed to load review'))
  const fallback = boundary.render()
  expect(fallback.props.triggerRef).toBe(triggerRef)
  expect(fallback.props.onClose).toBe(onClose)
  const html = renderToStaticMarkup(fallback)
  expect(html).toContain('<dialog')
  expect(html).toContain('role="alertdialog"')
  expect(html).toContain('aria-labelledby=')
  expect(html).toContain('aria-describedby=')
  expect(html).toContain('mdp-ui-card mdp-change-review-error')
  expect(html).toContain('mdp-ui-notice--danger')
  expect(html).toContain('Reload this viewer and try again.')
  expect(html).toContain('Close review')
})

it('escapes source and section titles, labels additions/deletions and displays line numbers', () => {
  const review = buildChangeReview('# <img src=x onerror=alert(1)>\nold\n', '# <img src=x onerror=alert(1)>\n<script>alert(1)</script>\n')
  const html = renderToStaticMarkup(React.createElement(ChangeReviewContent, {
    review, activeHunk: 0, registerHunk: vi.fn(), onJump: vi.fn(), canNavigate: false
  }))
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).toContain('&lt;img')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<img')
  expect(html).toContain('aria-label="added"')
  expect(html).toContain('aria-label="removed"')
  expect(html).toContain('Old line')
  expect(html).toContain('New line')
  expect(html).toContain('<dt>Added</dt><dd>+1</dd>')
  expect(html).toContain('<dt>Removed</dt><dd>−1</dd>')
  expect(html).toContain('<dt>Areas</dt><dd>1</dd>')
  expect(html).toContain('Changed areas in this comparison')
  expect(html).toContain('Area 1 of 1')
  expect(html).toContain('Previous area')
  expect(html).toContain('Next area')
  expect(html).not.toContain('aria-label="Previous change"')
})

it('shows deleted section names without a navigation button and gives a safe bounded fallback', () => {
  const review = buildChangeReview('# Gone\nold\n', '')
  const html = renderToStaticMarkup(React.createElement(ChangeReviewContent, { review, activeHunk: 0, registerHunk: vi.fn(), onJump: vi.fn() }))
  expect(html).toContain('mdp-change-review__section-name">Gone')
  expect(html).toContain('mdp-ui-badge--danger mdp-change-review__deleted-badge')
  expect(html).toContain('>Deleted</span>')
  expect(html).not.toContain('Open document')
  const fallback = renderToStaticMarkup(React.createElement(ChangeReviewContent, { review: { limited: true } }))
  expect(fallback).toContain('exceeds the size, time or output limit')
  expect(fallback).not.toContain('<table')
})

it('uses keyboard shortcuts for region navigation without intercepting normal scrolling keys', () => {
  expect(getReviewKeyboardAction({ key: 'ArrowDown', altKey: true })).toBe('next')
  expect(getReviewKeyboardAction({ key: 'ArrowUp', altKey: true })).toBe('previous')
  expect(getReviewKeyboardAction({ key: 'ArrowDown' })).toBeNull()
  expect(getReviewKeyboardAction({ key: 'ArrowDown', altKey: true, ctrlKey: true })).toBeNull()
})

it('explains the reviewed version and promotes a waiting update to the primary action', () => {
  const render = (kind) => renderToStaticMarkup(React.createElement(ChangeReviewPanel, {
    pair: { kind, before: 'old', after: 'new', generation: 1 },
    candidate: { kind, before: 'old', after: 'new', generation: 1 },
    acceptedSource: kind === 'pending' ? 'old' : 'new',
    triggerRef: { current: null },
    onClose: vi.fn(), onApply: vi.fn(), onCheck: vi.fn(), canCheck: true
  }))
  const pending = render('pending')
  expect(pending).toContain('<dialog')
  expect(pending).toContain('aria-modal="true"')
  expect(pending).toContain('Review changes')
  expect(pending).toContain('Update waiting')
  expect(pending).toContain('mdp-ui-badge--warning')
  expect(pending).toContain('See what changed on disk before updating this document.')
  expect(pending).toContain('mdp-ui-button--primary')
  expect(pending).toContain('Update document')
  expect(pending).toContain('Check latest')
  expect(pending).toContain('>Close</span>')

  const applied = render('applied')
  expect(applied).toContain('Last update')
  expect(applied).toContain('mdp-ui-badge--success')
  expect(applied).toContain('Changes applied in the most recent document update.')
  expect(applied).not.toContain('Update document')
})

it('makes leaving edit mode explicit and gives dirty drafts a destructive confirmation', () => {
  const renderPanel = (editorDirty) => renderToStaticMarkup(React.createElement(ChangeReviewPanel, {
    pair: { kind: 'pending', before: 'old', after: 'new', generation: 1 },
    candidate: { kind: 'pending', before: 'old', after: 'new', generation: 1 },
    acceptedSource: 'old', isEditMode: true, editorDirty,
    triggerRef: { current: null }, onClose: vi.fn(), onApply: vi.fn()
  }))
  const clean = renderPanel(false)
  expect(clean).toContain('Loading this update will close edit mode')
  expect(clean).toContain('Load disk version…')
  const dirty = renderPanel(true)
  expect(dirty).toContain('Your unsaved draft will be discarded')
  expect(dirty).toContain('mdp-ui-notice--danger')

  const confirmation = renderToStaticMarkup(React.createElement(EditorUpdateConfirmation, {
    open: true, dirty: true, onCancel: vi.fn(), onConfirm: vi.fn()
  }))
  expect(confirmation).toContain('role="alertdialog"')
  expect(confirmation).toContain('<dialog')
  expect(confirmation).toContain('Discard draft and load disk version')
  expect(confirmation).toContain('mdp-ui-button--danger')
  expect(confirmation).toContain('mdp-ui-card mdp-editor-update-confirmation')
  expect(confirmation).toContain('mdp-ui-action-footer')
  expect(confirmation).toContain('mdp-ui-badge--danger')
  expect(getEditorUpdateCopy(false).confirmLabel).toBe('Exit edit mode and load disk version')
  expect(renderToStaticMarkup(React.createElement(EditorUpdateWarning, { dirty: false }))).toContain('role="alert"')
})
