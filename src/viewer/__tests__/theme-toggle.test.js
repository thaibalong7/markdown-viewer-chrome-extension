import { beforeEach, describe, expect, it, vi } from 'vitest'

const { saveSettings } = vi.hoisted(() => ({
  saveSettings: vi.fn()
}))

vi.mock('../../settings/settings-client.js', () => ({
  saveSettings
}))

import { MarkdownViewerApp } from '../app.js'

function createThemeHarness(preset = 'light') {
  const app = Object.create(MarkdownViewerApp.prototype)
  app.settings = {
    enabled: true,
    theme: { activeId: preset, customThemes: [] },
    typography: { fontSize: 16 }
  }
  app._destroyed = false
  app._themeTogglePromise = null
  app.showToast = vi.fn()
  app.updateSettings = vi.fn(async (nextSettings) => {
    app.settings = nextSettings
  })
  return app
}

describe('MarkdownViewerApp light/dark quick toggle', () => {
  beforeEach(() => {
    saveSettings.mockReset()
  })

  it('applies the target theme locally before persistence completes', async () => {
    let resolveSave
    saveSettings.mockReturnValue(new Promise((resolve) => {
      resolveSave = resolve
    }))
    const app = createThemeHarness('light')

    const togglePromise = app._toggleLightDarkTheme()

    expect(app.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      theme: { activeId: 'dark', customThemes: [] }
    }))
    expect(app.settings.theme.activeId).toBe('dark')

    resolveSave({ ...app.settings, theme: { activeId: 'dark', customThemes: [] } })
    await togglePromise
    expect(app.showToast).toHaveBeenCalledWith('Switched to dark theme', {
      variant: 'success'
    })
  })

  it('restores the previous theme if persistence fails', async () => {
    saveSettings.mockRejectedValue(new Error('Service worker unavailable'))
    const app = createThemeHarness('dark')

    await app._toggleLightDarkTheme()

    expect(app.settings.theme.activeId).toBe('dark')
    expect(app.showToast).toHaveBeenCalledWith('Could not switch theme', {
      variant: 'error'
    })
  })
})
