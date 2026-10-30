// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsForm } from '../hooks/useSettingsForm.js'
import { getSettings, saveSettings } from '../../settings/settings-client.js'
import { saveThemeAsset, deleteThemeAsset } from '../../theme/theme-asset-client.js'
import { readSettingsFile } from '../options-actions.js'
import { STORAGE_ERRORS } from '../../settings/settings-storage-errors.js'
import { themeLibrary } from '../../settings/__tests__/theme-library-fixture.js'

vi.mock('../../settings/settings-client.js', () => ({ getSettings: vi.fn(), saveSettings: vi.fn(), resetSettings: vi.fn() }))
vi.mock('../../theme/theme-asset-client.js', () => ({ saveThemeAsset: vi.fn(), deleteThemeAsset: vi.fn() }))
vi.mock('../../shared/background-image.js', async original => ({
  ...await original(), readImageFileAsDataUrl: vi.fn(async () => 'data:image/png;base64,AA==')
}))
vi.mock('../options-actions.js', async original => ({ ...await original(), readSettingsFile: vi.fn() }))

describe('theme/image lifecycle across settings storage failures', () => {
  let root, host, form, initial
  beforeEach(async () => {
    vi.clearAllMocks()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    initial = themeLibrary(1)
    getSettings.mockResolvedValue(initial)
    saveThemeAsset.mockResolvedValue({ size: 1 })
    deleteThemeAsset.mockResolvedValue({ deleted: true })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    function Harness() { form = useSettingsForm(); return null }
    await act(async () => root.render(React.createElement(Harness)))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('removes only the newly uploaded image on quota failure and keeps the saved theme', async () => {
    saveSettings.mockRejectedValueOnce(new Error(STORAGE_ERRORS.quota))
    let result
    await act(async () => { result = await form.saveCustomTheme({ ...initial.theme.customThemes[0], name: 'Draft' }, new File(['x'], 'image.png')) })
    expect(result).toBeNull()
    expect(form.settings).toEqual(initial)
    expect(form.status).toEqual({ type: 'error', message: STORAGE_ERRORS.quota })
    const [newAssetId] = saveThemeAsset.mock.calls[0]
    expect(deleteThemeAsset).toHaveBeenCalledExactlyOnceWith(newAssetId)
    expect(deleteThemeAsset).not.toHaveBeenCalledWith(initial.theme.customThemes[0].background.assetId)
  })

  it('retires the old image only after the new descriptor was persisted', async () => {
    let complete
    saveSettings.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    let operation
    await act(async () => {
      operation = form.saveCustomTheme({ ...initial.theme.customThemes[0], name: 'Draft' }, new File(['x'], 'image.png'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(deleteThemeAsset).not.toHaveBeenCalled()
    const next = { ...initial, theme: saveSettings.mock.calls[0][0].theme }
    await act(async () => { complete(next); await operation })
    expect(form.settings).toEqual(next)
    expect(deleteThemeAsset).toHaveBeenCalledExactlyOnceWith(initial.theme.customThemes[0].background.assetId)
  })

  it('keeps the current settings and library when importing a valid file exceeds storage quota', async () => {
    readSettingsFile.mockResolvedValueOnce(JSON.stringify(themeLibrary(32)))
    saveSettings.mockRejectedValueOnce(new Error(STORAGE_ERRORS.quota))
    await act(async () => form.importAll(new File(['{}'], 'settings.json')))
    expect(form.settings).toEqual(initial)
    expect(form.status).toEqual({ type: 'error', message: STORAGE_ERRORS.quota })
    expect(deleteThemeAsset).not.toHaveBeenCalled()
  })
})
