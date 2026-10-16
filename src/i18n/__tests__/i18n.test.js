import { validateThemeBackgroundFile } from '../../shared/background-image.js'
import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'rolldown/parseAst'
import {
  catalogs, formatDate, formatNumber, getLocale, resolveLocale, setLanguage,
  subscribeLocale, t, translateMessage, message
} from '../index.js'
import { PLUGIN_LABELS, PLUGIN_HINTS, PLUGIN_VERSION_NOTES, FONT_FAMILY_PRESETS, SETTINGS_TABS } from '../../popup/settings-constants.js'
import { EDITABLE_THEME_COLOR_FIELDS } from '../../theme/index.js'
import { getEditorPhrases } from '../editor-phrases.js'
import { normalizeSettings } from '../../settings/settings-schema.js'
import { parseSettingsJson } from '../../options/settings-import.js'

afterEach(() => setLanguage('en'))

describe('locale resolution and messages', () => {
  it('honors explicit choice, browser priority and regional variants with English fallback', () => {
    expect(resolveLocale('auto', ['vi-VN', 'en-US'])).toBe('vi')
    expect(resolveLocale('auto', ['fr-FR', 'vi'])).toBe('vi')
    expect(resolveLocale('auto', ['en-GB', 'vi'])).toBe('en')
    expect(resolveLocale('en', ['vi-VN'])).toBe('en')
    expect(resolveLocale('vi', ['en-US'])).toBe('vi')
    expect(resolveLocale('auto', ['fr-FR'])).toBe('en')
    expect(resolveLocale('auto', [])).toBe('en')
  })

  it('subscribes to actual language changes and releases listeners', () => {
    setLanguage('en')
    const received = []
    const unsubscribe = subscribeLocale(() => received.push(getLocale()))
    setLanguage('vi'); setLanguage('vi'); unsubscribe(); setLanguage('en')
    expect(received).toEqual(['vi'])
  })

  it('resolves Simplified Chinese without treating Traditional Chinese as Simplified', () => {
    for (const tag of ['zh', 'zh-CN', 'ZH_cn', 'zh-SG', 'zh-Hans', 'zh-Hans-CN', 'zh-Hans-TW', 'zh-CN-u-nu-hanidec']) {
      expect(resolveLocale('auto', [tag, 'vi']), tag).toBe('zh-CN')
    }
    for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'zh-Latn', 'zh-US']) {
      expect(resolveLocale('auto', [tag, 'vi']), tag).toBe('vi')
      expect(resolveLocale('auto', [tag]), tag).toBe('en')
    }
    expect(resolveLocale('zh-CN', ['vi'])).toBe('zh-CN')
    expect(resolveLocale('auto', ['fr', 'zh-Hant', 'zh-Hans', 'en'])).toBe('zh-CN')
    expect(resolveLocale('auto', ['en', 'zh-CN'])).toBe('en')
  })

  it('formats Chinese counts and diagnostics while keeping Unicode and key-like filenames literal', () => {
    setLanguage('zh-CN')
    for (const count of [0, 1, 12, 1234]) {
      const formatted = new Intl.NumberFormat('zh-CN').format(count)
      expect(t('viewer.statistics.words', { count })).toBe(`${formatted} 个词`)
      expect(t('popup.history.fileCount', { count })).toBe(`最近文件：${formatted} 个`)
    }
    expect(formatNumber(1234.5)).toBe('1,234.5')
    expect(formatDate(new Date('2026-10-15T00:00:00Z'), { timeZone: 'UTC' })).toBe('2026/10/15')
    for (const name of ['项目说明与设计评审—最终版本（2026年十月）.md', 'options.general.title']) {
      expect(t('viewer.explorer.actions.menuLabel', { 0: name })).toBe(`${name} 的操作`)
      expect(translateMessage(`Could not read /tmp/${name}: permission denied`)).toBe(`无法读取 /tmp/${name}：permission denied`)
    }
    const phrases = getEditorPhrases('zh-CN')
    expect(phrases['replace all']).toBe('全部替换')
    for (const [phrase, translated] of Object.entries(phrases)) {
      expect(translated.match(/\$/g)?.length || 0).toBe(phrase.match(/\$/g)?.length || 0)
    }
    expect(t('options.title', {}, 'zh-TW')).toBe('Settings')
  })

  it('interpolates plain text safely, retains missing placeholders and falls back predictably', () => {
    setLanguage('vi')
    expect(t('viewer.explorer.actions.menuLabel', { 0: '<script>{name}</script>' })).toBe('Thao tác với <script>{name}</script>')
    expect(t('viewer.explorer.actions.menuLabel')).toBe('Thao tác với {0}')
    expect(t('A new untranslated key')).toBe('A new untranslated key')
    expect(t('options.title', {}, 'fr')).toBe('Settings')
    expect(t('Settings')).toBe('Settings')
    expect(t('options')).toBe('options')
    expect(t('options.toString')).toBe('options.toString')
    expect(t('toString')).toBe('toString')
    expect(t('__proto__')).toBe('__proto__')
  })

  it('resolves nested message values without interpreting literal filenames as keys', () => {
    const label = message('viewer.explorer.actions.menuLabel', { 0: 'options.general.title' })
    setLanguage('vi')
    expect(t(label)).toBe('Thao tác với options.general.title')
    const theme = message('viewer.actions.theme.switch', { 0: message('common.themeModes.dark') })
    expect(t(theme)).toBe('Đổi sang giao diện tối')
    setLanguage('en')
    expect(t(theme)).toBe('Switch to dark theme')
    const translated = catalogs.vi.options.general.title
    delete catalogs.vi.options.general.title
    try { expect(t('options.general.title', {}, 'vi')).toBe('General') }
    finally { catalogs.vi.options.general.title = translated }
  })

  it('uses locale plural rules and number/date formatting', () => {
    setLanguage('en')
    expect(t('viewer.statistics.words', { count: 1 })).toBe('1 word')
    expect(t('viewer.statistics.words', { count: 0 })).toBe('0 words')
    setLanguage('vi')
    expect(t('viewer.statistics.words', { count: 1 })).toBe('1 từ')
    expect(t('viewer.statistics.words', { count: 1234 })).toBe('1.234 từ')
    expect(formatNumber(1234.5)).toBe('1.234,5')
    expect(formatDate(new Date('2026-10-15T00:00:00Z'), { timeZone: 'UTC' })).toBe('15/10/2026')
  })

  it('localizes owned service errors with literal paths and leaves third-party diagnostics intact', () => {
    setLanguage('vi')
    expect(translateMessage('This text file is larger than the 12 MiB viewing limit.')).toBe('Tệp văn bản này lớn hơn mức cho phép (12 MiB).')
    expect(translateMessage('Could not read /Users/Settings.md: permission denied')).toBe('Không thể đọc /Users/Settings.md: permission denied')
    expect(translateMessage('Maximum indexed files must be between 10 and 20,000.')).toBe('Số tệp tối đa trong danh sách phải nằm trong khoảng từ 10 đến 20.000.')
    expect(translateMessage('Switch to dark theme')).toBe('Đổi sang giao diện tối')
    expect(translateMessage('DOMException: browser-specific error')).toBe('DOMException: browser-specific error')
    try {
      validateThemeBackgroundFile({ type: 'image/png', size: 6 * 1024 * 1024 })
      throw new Error('Expected image validation to reject this file')
    } catch (error) {
      expect(translateMessage(error.message)).toBe('Ảnh nền phải có kích thước tối đa 5 MiB.')
    }
    expect(getEditorPhrases('vi')['replace all']).toBe('Thay thế tất cả')
    expect(getEditorPhrases('vi')['replaced $ matches']).toContain('$')
  })
})

function flatten(catalog, prefix = '', result = {}) {
  for (const [part, entry] of Object.entries(catalog)) {
    const key = prefix ? `${prefix}.${part}` : part
    if (typeof entry === 'string' || typeof entry.other === 'string') result[key] = entry
    else flatten(entry, key, result)
  }
  return result
}
const englishMessages = flatten(catalogs.en)

describe('catalog and persisted language contract', () => {
  it('keeps every locale complete and preserves all interpolation placeholders', () => {
    const placeholders = text => [...new Set(text.match(/\{\w+\}/g) || [])].sort()
    for (const [locale, catalog] of Object.entries(catalogs)) {
      const messages = flatten(catalog)
      expect(Object.keys(messages).sort(), locale).toEqual(Object.keys(englishMessages).sort())
      for (const [key, entry] of Object.entries(messages)) {
        expect(key).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/)
        const variants = typeof entry === 'string' ? [entry] : Object.values(entry)
        const source = typeof englishMessages[key] === 'string' ? englishMessages[key] : englishMessages[key].other
        if (typeof entry === 'object') expect(entry.other, `${locale}: ${key}`).toBeTruthy()
        for (const value of variants) {
          expect(value.trim(), `${locale}: ${key}`).not.toBe('')
          expect(placeholders(value), `${locale}: ${key}`).toEqual(placeholders(source))
        }
      }
    }
  })

  it('registers labels and descriptions held in shared UI metadata', () => {
    const labels = [
      ...Object.values(PLUGIN_LABELS), ...Object.values(PLUGIN_HINTS), ...Object.values(PLUGIN_VERSION_NOTES),
      ...FONT_FAMILY_PRESETS.map(item => item.label), ...SETTINGS_TABS.flatMap(item => [item.label, item.title]),
      ...EDITABLE_THEME_COLOR_FIELDS.map(item => item.labelKey)
    ]
    for (const label of labels) expect(Object.hasOwn(englishMessages, label), label).toBe(true)
  })

  it('registers every literal translation call in runtime source', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url))
    function scan(dir) {
      for (const file of readdirSync(dir, { withFileTypes: true })) {
        if (file.name === '__tests__') continue
        const path = `${dir}/${file.name}`
        if (file.isDirectory()) { scan(path); continue }
        if (!/\.jsx?$/.test(path)) continue
        const ast = parseAst(readFileSync(path, 'utf8'), { lang: path.endsWith('.jsx') ? 'jsx' : 'js' })
        function walk(node) {
          if (!node || typeof node !== 'object') return
          if (node.type === 'CallExpression' && ['t', 'message', 'localizedMessage'].includes(node.callee?.name) && typeof node.arguments[0]?.value === 'string') {
            expect(Object.hasOwn(englishMessages, node.arguments[0].value), `${path}: ${node.arguments[0].value}`).toBe(true)
          }
          for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(walk)
            else if (value && typeof value === 'object') walk(value)
          }
        }
        walk(ast)
      }
    }
    scan(root)
  })

  it('accepts additive settings, validates imports and defaults invalid stored preferences', () => {
    expect(normalizeSettings({ language: 'vi' }).language).toBe('vi')
    expect(normalizeSettings({ language: 'zh-CN' }).language).toBe('zh-CN')
    expect(parseSettingsJson('{"language":"zh-CN"}').language).toBe('zh-CN')
    expect(() => normalizeSettings({ language: 'zh-TW' })).toThrow('Choose a supported interface language.')
    expect(normalizeSettings({ language: 'fr' }, { invalid: 'default' }).language).toBe('auto')
    expect(() => normalizeSettings({ language: 'fr' })).toThrow('Choose a supported interface language.')
    expect(parseSettingsJson('{"language":"vi"}').language).toBe('vi')
    expect(() => parseSettingsJson('{"language":"xx"}')).toThrow()
  })
})
