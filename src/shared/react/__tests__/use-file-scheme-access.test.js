import { describe, expect, it } from 'vitest'
import { toFileSchemeAccessState } from '../useFileSchemeAccess.js'

describe('file scheme access state', () => {
  it('distinguishes allowed, blocked, and unavailable states', () => {
    expect(toFileSchemeAccessState(true)).toEqual({ state: 'allowed', message: 'Allowed' })
    expect(toFileSchemeAccessState(false)).toEqual({ state: 'blocked', message: 'Not allowed' })
    expect(toFileSchemeAccessState(null)).toEqual({ state: 'unavailable', message: 'Unavailable' })
  })
})
