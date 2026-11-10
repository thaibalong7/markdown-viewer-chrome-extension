import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { catalogs, resolveLocale, setLanguage, t, translateMessage } from '../index.js'
import { getEditorPhrases } from '../editor-phrases.js'
import { normalizeSettings } from '../../settings/settings-schema.js'
import { parseSettingsJson } from '../../options/settings-import.js'

const cases = {
  es: { tags: ['es-ES', 'es-MX', 'ES_ar'], title: 'Configuración', words: ['0 palabras', '1 palabra', '2 palabras', '20 palabras'], replace: 'reemplazar todo' },
  de: { tags: ['de-DE', 'de-AT', 'DE_ch'], title: 'Einstellungen', words: ['0 Wörter', '1 Wort', '2 Wörter', '20 Wörter'], replace: 'alle ersetzen' },
  ja: { tags: ['ja-JP', 'JA_jp'], title: '設定', words: ['0 語', '1 語', '2 語', '20 語'], replace: 'すべて置換' },
  ro: { tags: ['ro-RO', 'ro-MD', 'RO_ro'], title: 'Setări', words: ['0 cuvinte', '1 cuvânt', '2 cuvinte', '20 de cuvinte'], replace: 'înlocuiește tot' }
}

afterEach(() => setLanguage('en'))

describe.each(Object.keys(cases))('%s interface language', locale => {
  const sample = cases[locale]
  it('resolves regional browser preferences and accepts settings exports/imports', () => {
    expect(Object.hasOwn(catalogs, locale)).toBe(true)
    for (const tag of sample.tags) expect(resolveLocale('auto', ['fr-FR', tag, 'en'])).toBe(locale)
    expect(resolveLocale(locale, ['en-US'])).toBe(locale)
    expect(resolveLocale('auto', ['en-US', sample.tags[0]])).toBe('en')
    const saved = normalizeSettings({ language: locale })
    expect(parseSettingsJson(JSON.stringify(saved)).language).toBe(locale)
    expect(t('options.title', {}, locale)).toBe(sample.title)
    const native = JSON.parse(readFileSync(new URL(`../../../public/_locales/${locale}/messages.json`, import.meta.url), 'utf8'))
    expect(native.extensionDescription.message.trim()).not.toBe('')
  })

  it('uses the locale plural rules and preserves CodeMirror substitutions', () => {
    setLanguage(locale)
    for (const [index, count] of [0, 1, 2, 20].entries()) expect(t('viewer.statistics.words', { count })).toBe(sample.words[index])
    const phrases = getEditorPhrases(locale)
    expect(phrases['replace all']).toBe(sample.replace)
    for (const [source, translated] of Object.entries(phrases)) {
      expect(translated.match(/\$/g)?.length || 0, source).toBe(source.match(/\$/g)?.length || 0)
    }
  })

  if (locale === 'ro') it('handles Romanian count boundaries beyond the first twenty', () => {
    setLanguage(locale)
    for (const [count, expected] of [[19, '19 cuvinte'], [100, '100 de cuvinte'], [101, '101 cuvinte'], [119, '119 cuvinte'], [120, '120 de cuvinte']]) {
      expect(t('viewer.statistics.words', { count })).toBe(expected)
    }
    expect(t('viewer.search.summary', { count: 20, scanned: 2, total: 3 })).toBe('20 de potriviri · fișiere parcurse: 2/3')
  })

  it('keeps Unicode, long filenames and key-like paths literal in messages', () => {
    setLanguage(locale)
    for (const name of ['Ședință—日本語—diseño—Änderungen—2026.md', 'options.general.title']) {
      expect(t('viewer.explorer.actions.menuLabel', { 0: name })).toContain(name)
      expect(translateMessage(`Could not read /tmp/${name}: permission denied`)).toContain(`/tmp/${name}`)
    }
    expect(t('errors.validation.boolean', { 0: 'editor.enabled' })).toMatch(/true.*false/)
    expect(translateMessage('DOMException: unknown browser error')).toBe('DOMException: unknown browser error')
  })
})
