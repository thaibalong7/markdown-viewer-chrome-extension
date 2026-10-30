// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toFileSchemeAccessState, useFileSchemeAccess } from '../useFileSchemeAccess.js'

describe('file scheme access state', () => {
  it('distinguishes allowed, blocked, and unavailable states', () => {
    expect(toFileSchemeAccessState(true)).toEqual({ state: 'allowed', message: 'common.fileAccess.allowed' })
    expect(toFileSchemeAccessState(false)).toEqual({ state: 'blocked', message: 'common.fileAccess.blocked' })
    expect(toFileSchemeAccessState(null)).toEqual({ state: 'unavailable', message: 'common.status.unavailable' })
  })
})

describe('file access onboarding lifecycle', () => {
  let host, root, accessApi, allowed

  function Status() {
    const access = useFileSchemeAccess()
    return React.createElement('output', null, access.state)
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    allowed = false
    accessApi = vi.fn(callback => callback(allowed))
    vi.stubGlobal('chrome', {
      extension: { isAllowedFileSchemeAccess: accessApi },
      runtime: {}
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows blocked initially and refreshes both permission changes when Settings regains focus', async () => {
    await act(async () => root.render(React.createElement(Status)))
    expect(host.textContent).toBe('blocked')

    allowed = true
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(host.textContent).toBe('allowed')

    allowed = false
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(host.textContent).toBe('blocked')
  })

  it('refreshes after returning to a visible extension page', async () => {
    await act(async () => root.render(React.createElement(Status)))
    allowed = true
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(host.textContent).toBe('allowed')
  })

  it('recovers from an API error on a later focus', async () => {
    accessApi.mockRejectedValueOnce(new Error('Permission status unavailable'))
    await act(async () => root.render(React.createElement(Status)))
    expect(host.textContent).toBe('unavailable')

    allowed = true
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(host.textContent).toBe('allowed')
  })

  it('removes refresh listeners when the popup or Settings unmounts', async () => {
    await act(async () => root.render(React.createElement(Status)))
    await act(async () => root.unmount())
    root = null
    const calls = accessApi.mock.calls.length
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(accessApi).toHaveBeenCalledTimes(calls)
  })
})
