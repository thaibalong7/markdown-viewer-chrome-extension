import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import { normalizeSettings } from '../settings-schema.js'
import { needsFullRender } from '../../shared/settings-diff.js'

describe('watch settings', () => {
  it('defaults to asking and accepts all three modes without a Markdown rerender', () => {
    expect(DEFAULT_SETTINGS.watch.mode).toBe('ask')
    for (const mode of ['ask', 'auto', 'off']) {
      const next = { ...DEFAULT_SETTINGS, watch: { mode } }
      expect(normalizeSettings(next).watch.mode).toBe(mode)
      expect(needsFullRender(DEFAULT_SETTINGS, next)).toBe(false)
    }
  })

  it.each([null, [], 'auto', { mode: 'invalid' }])('rejects invalid settings and repairs stored values: %j', (watch) => {
    expect(() => normalizeSettings({ watch })).toThrow()
    expect(normalizeSettings({ watch }, { invalid: 'default' }).watch).toEqual({ mode: 'ask' })
  })

  it('accepts an additive empty watch setting', () => {
    expect(normalizeSettings({ watch: {} }).watch).toEqual({ mode: 'ask' })
    expect(normalizeSettings({ enabled: true })).toEqual({ enabled: true })
  })
})
