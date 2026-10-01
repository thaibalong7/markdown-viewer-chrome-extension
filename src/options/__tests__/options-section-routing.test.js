import { describe, expect, it } from 'vitest'
import { resolveSettingsSection } from '../OptionsApp.jsx'

describe('settings section routing', () => {
  it('opens the Files & Workspace section from its deep link', () => {
    expect(resolveSettingsSection('#explorer')).toBe('explorer')
  })

  it('opens the About section from its deep link', () => {
    expect(resolveSettingsSection('#about')).toBe('about')
  })

  it('falls back to General for an unknown section', () => {
    expect(resolveSettingsSection('#unknown')).toBe('general')
  })
})
