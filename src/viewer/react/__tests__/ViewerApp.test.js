import { describe, expect, it, vi } from 'vitest'
import { shouldInitiallyShowFilesPanel } from '../ViewerApp.jsx'

describe('responsive Files panel default', () => {
  it('starts closed below the desktop breakpoint and open on desktop', () => {
    const mobileMatchMedia = vi.fn().mockReturnValue({ matches: false })
    const desktopMatchMedia = vi.fn().mockReturnValue({ matches: true })

    expect(shouldInitiallyShowFilesPanel(mobileMatchMedia)).toBe(false)
    expect(shouldInitiallyShowFilesPanel(desktopMatchMedia)).toBe(true)
    expect(mobileMatchMedia).toHaveBeenCalledWith('(min-width: 1024px)')
  })

  it('keeps the historical open default when matchMedia is unavailable', () => {
    expect(shouldInitiallyShowFilesPanel(undefined)).toBe(true)
  })
})
