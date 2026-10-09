import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WatchStatus, getWatchMessage, getWatchTriggerPresentation } from '../WatchStatus.jsx'

describe('watch chrome', () => {
  it('keeps the animated trigger at the same DOM position across ready, busy and settled states', () => {
    for (const phase of [
      { pending: true, manualChecking: false },
      { pending: true, manualChecking: true },
      { pending: false, manualChecking: false }
    ]) {
      const html = renderToStaticMarkup(React.createElement(WatchStatus, {
        state: { available: true, supported: true, mode: 'ask', ...phase }
      }))
      // Inserting the disabled tooltip wrapper only during busy replaces the
      // button and SVG nodes, restarting their rotation and crossfade.
      expect(html).toMatch(/<div class="mdp-watch-status"[^>]*><span class="mdp-icon-button-tooltip-anchor"><button[^>]*mdp-watch-status__trigger/)
      const trigger = html.match(/<button[^>]*mdp-watch-status__trigger[^>]*>/)[0]
      expect(trigger.includes('disabled=""')).toBe(phase.manualChecking)
      expect(trigger.includes('aria-busy="true"')).toBe(phase.manualChecking)
    }
  })

  it('disables both direct update controls while an explicit update is running', () => {
    const html = renderToStaticMarkup(React.createElement(WatchStatus, {
      state: { available: true, supported: true, pending: true, manualChecking: true }
    }))
    expect(html).toMatch(/<button[^>]*mdp-watch-status__trigger[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*mdp-watch-status__notice[^>]*disabled=""/)
  })

  it('offers a manual check when watch is off and no update is pending', () => {
    const html = renderToStaticMarkup(React.createElement(WatchStatus, {
      state: { available: true, supported: true, mode: 'off' }
    }))
    expect(html).toContain('>Off</span>')
    expect(html).toContain('hidden="" role="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Check now')
    expect(html).not.toContain('Load update')
  })

  it('offers an explicit load while editing and disables actions during a user-requested read', () => {
    const html = renderToStaticMarkup(React.createElement(WatchStatus, {
      state: { available: true, supported: true, pending: true, manualChecking: true }, isEditMode: true, editorDirty: true
    }))
    expect(html).toContain('Load disk version…')
    expect(html).toContain('Unsaved draft will be discarded')
    expect(html).toContain('Loading the disk version permanently replaces your draft')
    expect(html).toContain('mdp-ui-notice--danger')
    expect(html).toContain('mdp-watch-status__panel--editor-update')
    expect(html).not.toContain('This file changed on disk. Load it to leave edit mode.')
    expect(html).toContain('role="status"')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
  })

  it('explains snapshot-only workspaces without offering an ineffective check', () => {
    const html = renderToStaticMarkup(React.createElement(WatchStatus, {
      state: { available: true, supported: false }
    }))
    expect(html).toContain('Select the workspace again')
    expect(html).not.toContain('Check now')
  })
})


it('keeps idle state and checking out of the announcement and attention badge', () => {
  const html = renderToStaticMarkup(React.createElement(WatchStatus, {
    state: { available: true, supported: true, mode: 'ask' }
  }))
  expect(html).not.toContain('trigger--attention')
  expect(html).not.toContain('disabled=""')
  expect(html).toContain('aria-expanded="false"')
  expect(html).toContain('aria-atomic="true"></span>')
})

it('makes a deferred automatic update available as a one-click fallback', () => {
  const state = { available: true, supported: true, pending: true, deferred: true, mode: 'auto' }
  expect(getWatchMessage(state, false)).toContain('stop interacting')
  expect(getWatchMessage(state, true)).toContain('leave edit mode')
  expect(getWatchTriggerPresentation(state, false)).toEqual({ action: 'apply', label: 'Update document' })
  const html = renderToStaticMarkup(React.createElement(WatchStatus, { state }))
  expect(html).toContain('trigger--attention')
  expect(html).toContain('data-mdp-watch-action="apply"')
  expect(html).toContain('aria-label="Update document"')
  expect(html).toContain('Update now')
  expect(html).toContain('mdp-watch-status__notice')
  expect(html).not.toContain('aria-haspopup="dialog"')
})

it('does not prompt while a stable automatic update is being applied', () => {
  const state = { available: true, supported: true, pending: true, deferred: false, mode: 'auto' }
  expect(getWatchMessage(state, false)).toContain('being applied automatically')
  expect(getWatchTriggerPresentation(state, false)).toEqual({
    action: 'details',
    label: 'Document updates'
  })
  const html = renderToStaticMarkup(React.createElement(WatchStatus, { state }))
  expect(html).toContain('Applying a new document version automatically.')
  expect(html).not.toContain('mdp-watch-status__notice')
  expect(html).not.toContain('mdp-watch-status__panel--has-actions')
})


it('uses a dedicated header check control and a shared primary update action', () => {
  const html = renderToStaticMarkup(React.createElement(WatchStatus, {
    state: { available: true, supported: true, pending: true, mode: 'ask' }
  }))
  expect(html).toContain('mdp-ui-button--primary')
  expect(html).toContain('mdp-watch-status__check')
  expect(html).toContain('aria-label="Check now"')
  expect(html).not.toContain('class="mdp-button"')
})

it('renders the compact status header with a mode badge and quiet standalone check', () => {
  const html = renderToStaticMarkup(React.createElement(WatchStatus, {
    state: { available: true, supported: true, mode: 'auto' }
  }))
  expect(html).toContain('mdp-watch-status__mode')
  expect(html).toContain('mdp-ui-badge--success')
  expect(html).toContain('mdp-watch-status__check')
  expect(html).toContain('aria-label="Check now"')
  expect(html).toContain('Updates load when the file is stable')
  expect(html.indexOf('Check now')).toBeLessThan(html.indexOf('Updates load when the file is stable'))
  expect(html).not.toContain('Close document updates')
  expect(html).not.toContain('mdp-watch-status__panel--has-actions')
})

it('uses shared notice semantics for unavailable and failed update states', () => {
  const unavailable = renderToStaticMarkup(React.createElement(WatchStatus, {
    state: { available: true, supported: false }
  }))
  expect(unavailable).toContain('mdp-ui-notice--warning')
  const failed = renderToStaticMarkup(React.createElement(WatchStatus, {
    state: { available: true, supported: true, error: 'Could not read the file.' }
  }))
  expect(failed).toContain('mdp-ui-notice--danger')
  expect(failed).toContain('Update check failed')
})

it('turns the pending reader trigger into a one-click update action', () => {
  const state = { available: true, supported: true, pending: true, mode: 'ask' }
  expect(getWatchTriggerPresentation(state, false)).toEqual({ action: 'apply', label: 'Update document' })
  const html = renderToStaticMarkup(React.createElement(WatchStatus, { state }))
  expect(html).toContain('data-mdp-watch-action="apply"')
  expect(html).toContain('aria-label="Update document"')
  expect(html).toContain('mdp-watch-status__icon--apply')
  expect(html).toContain('mdp-watch-status__notice')
  expect(html).toContain('New version available')
  expect(html).not.toContain('aria-haspopup="dialog"')
})

it('keeps pending editor updates behind the details panel', () => {
  const state = { available: true, supported: true, pending: true, mode: 'ask' }
  expect(getWatchTriggerPresentation(state, true)).toEqual({
    action: 'details',
    label: 'Document updates: load update'
  })
  const html = renderToStaticMarkup(React.createElement(WatchStatus, { state, isEditMode: true }))
  expect(html).toContain('data-mdp-watch-action="details"')
  expect(html).toContain('aria-haspopup="dialog"')
  expect(html).not.toContain('mdp-watch-status__notice')
})
