import { describe, expect, it } from 'vitest'
import { resolveSettingsSection } from '../OptionsApp.jsx'

describe('settings section routing', () => {
  it('opens the Files & Workspace section from its deep link', () => {
    expect(resolveSettingsSection('#explorer')).toBe('explorer')
  })

  it('falls back to General for an unknown section', () => {
    expect(resolveSettingsSection('#unknown')).toBe('general')
  })
})
