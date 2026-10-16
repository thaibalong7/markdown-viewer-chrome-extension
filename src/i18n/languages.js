// Add a locale here and its catalogs in index.js; regional variants resolve by base language.
export const LANGUAGES = Object.freeze([
  Object.freeze({ value: 'auto', label: 'common.languages.browser' }),
  Object.freeze({ value: 'en', label: 'common.languages.en' }),
  Object.freeze({ value: 'vi', label: 'common.languages.vi' })
])

export function resolveLocale(preference = 'auto', browserLanguages = globalThis.navigator?.languages || [globalThis.navigator?.language || 'en']) {
  const supported = new Set(LANGUAGES.filter(({ value }) => value !== 'auto').map(({ value }) => value))
  const candidates = preference === 'auto' ? browserLanguages : [preference]
  for (const candidate of candidates) {
    const base = String(candidate).toLowerCase().split(/[-_]/)[0]
    if (supported.has(base)) return base
  }
  return 'en'
}
