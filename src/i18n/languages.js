// Add a locale here and its catalogs in index.js; keep script-specific matching below.
export const LANGUAGES = Object.freeze([
  Object.freeze({ value: 'auto', label: 'common.languages.browser' }),
  Object.freeze({ value: 'en', label: 'common.languages.en' }),
  Object.freeze({ value: 'vi', label: 'common.languages.vi' }),
  Object.freeze({ value: 'zh-CN', label: 'common.languages.zhCN' })
])

export function resolveLocale(preference = 'auto', browserLanguages = globalThis.navigator?.languages || [globalThis.navigator?.language || 'en']) {
  const supported = new Set(LANGUAGES.filter(({ value }) => value !== 'auto').map(({ value }) => value))
  const candidates = preference === 'auto' ? browserLanguages : [preference]
  for (const candidate of candidates) {
    const [base, ...subtags] = String(candidate).toLowerCase().split(/[-_]/)
    if (base === 'zh') {
      // An explicit script takes precedence over region. Do not route Traditional
      // Chinese preferences to the Simplified Chinese catalog.
      const script = /^[a-z]{4}$/.test(subtags[0] || '') ? subtags[0] : undefined
      const regionTag = subtags[script ? 1 : 0] || ''
      const region = /^[a-z]{2}$|^\d{3}$/.test(regionTag) ? regionTag : undefined
      if (script ? script === 'hans' : !region || ['cn', 'sg'].includes(region)) return 'zh-CN'
      continue
    }
    if (supported.has(base)) return base
  }
  return 'en'
}
