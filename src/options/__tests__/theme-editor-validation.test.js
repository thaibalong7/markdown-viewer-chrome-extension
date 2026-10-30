// @vitest-environment jsdom
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeBackgroundFields } from '../sections/ThemeBackgroundFields.jsx'
import { createCustomThemeDraft } from '../../theme/index.js'
import { normalizeThemeSettings } from '../../settings/settings-schema.js'

describe('Theme Studio browser form validation', () => {
  it.each([
    { type: 'solid', color: '#112233', overlayOpacity: 0.08 },
    { type: 'image', assetId: 'theme-asset:12345678', overlayOpacity: 0.08 },
    { type: 'gradient', startColor: '#112233', endColor: '#445566', angle: 135.25, overlayOpacity: 0.123456789 }
  ])('allows a schema-valid $type background to submit through native Chrome validation', background => {
    const draft = { ...createCustomThemeDraft('light'), background: { motion: 'system', ...background } }
    expect(() => normalizeThemeSettings({ activeId: draft.id, customThemes: [draft] })).not.toThrow()
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(React.createElement('form', null,
      React.createElement(ThemeBackgroundFields, {
        draft, disabled: false, imageFile: null, onBackgroundChange: vi.fn(), onImageFileChange: vi.fn()
      })
    ))
    expect(host.querySelector('form').checkValidity()).toBe(true)
  })
})
