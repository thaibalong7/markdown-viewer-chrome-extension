import en from './locales/en.json'
import vi from './locales/vi.json'
import zhCN from './locales/zh-CN.json'
import { resolveLocale, LANGUAGES } from './languages.js'
import { DIAGNOSTIC_KEYS, VALIDATION_LABEL_KEYS } from './diagnostic-keys.js'

export { resolveLocale, LANGUAGES } from './languages.js'

export const catalogs = Object.freeze({ en, vi, 'zh-CN': zhCN })
const listeners = new Set()
let preference = 'auto'
let locale = resolveLocale(preference)

export function getLocale() { return locale }
export function getLanguagePreference() { return preference }
export function subscribeLocale(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLanguage(language = 'auto') {
  preference = LANGUAGES.some(({ value }) => value === language) ? language : 'auto'
  const next = resolveLocale(preference)
  if (next === locale) return
  locale = next
  for (const listener of listeners) listener()
}

function entryAt(catalog, key) {
  if (typeof key !== 'string') return undefined
  let entry = catalog
  for (const part of key.split('.')) {
    if (!entry || typeof entry !== 'object' || !Object.hasOwn(entry, part)) return undefined
    entry = entry[part]
  }
  return typeof entry === 'string' || entry && typeof entry.other === 'string' ? entry : undefined
}

/** Store an untranslated message in UI state so language changes also update it. */
export function message(key, values = {}) {
  return { messageKey: key, values }
}

export function isMessage(value) {
  return Boolean(value && typeof value === 'object' && Object.hasOwn(value, 'messageKey') && typeof value.messageKey === 'string')
}

/** Resolve semantic IDs to plain text. Interpolation never interprets user strings as IDs. */
export function t(key, values = {}, language = locale) {
  if (isMessage(key)) return t(key.messageKey, key.values, language)
  if (typeof key !== 'string') return key
  const resolvedLanguage = Object.hasOwn(catalogs, language) ? language : 'en'
  const selected = entryAt(catalogs[resolvedLanguage], key)
  const entry = selected ?? entryAt(en, key)
  if (entry === undefined) return key
  const category = typeof entry === 'object'
    ? new Intl.PluralRules(resolvedLanguage).select(Number(values.count) || 0) : null
  const template = category ? entry[category] ?? entry.other : entry
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
    if (!Object.hasOwn(values, name)) return placeholder
    const value = values[name]
    if (isMessage(value)) return t(value, {}, language)
    return typeof value === 'number' ? new Intl.NumberFormat(resolvedLanguage).format(value) : String(value)
  })
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatDate(value, options) {
  return new Intl.DateTimeFormat(locale, options).format(value)
}

/** Convert an owned service diagnostic to an explicit message; keep unknown errors verbatim. */
export function diagnosticMessage(value) {
  if (isMessage(value) || typeof value !== 'string') return value
  if (entryAt(en, value) !== undefined) return message(value)
  for (const { key, pattern, names } of diagnosticTemplates) {
    const match = pattern.exec(value)
    if (!match) continue
    const values = Object.fromEntries(names.map((name, i) => [name, match[i + 1]]))
    if (key.startsWith('errors.validation.')) {
      const labelKey = VALIDATION_LABEL_KEYS[values[0]]
      if (labelKey) values[0] = message(labelKey)
      for (const name of ['1', '2']) {
        if (/^\d[\d,]*$/.test(values[name])) values[name] = Number(values[name].replaceAll(',', ''))
      }
    }
    if (key === 'viewer.actions.theme.switch' || key === 'viewer.actions.theme.switched') {
      if (values[0] === 'dark' || values[0] === 'light') values[0] = message(`common.themeModes.${values[0]}`)
    }
    return message(key, values)
  }
  return value
}

/** Adapt service diagnostics at the UI boundary; never use for user content. */
export function translateMessage(value) {
  return t(diagnosticMessage(value))
}

const diagnosticTemplates = DIAGNOSTIC_KEYS.map(key => {
  const template = entryAt(en, key)
  const names = []
  const escaped = template.split(/(\{\w+\})/).map(part => {
    if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '([\\s\\S]+?)' }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('')
  return { key, names, pattern: new RegExp(`^${escaped}$`), specificity: template.replace(/\{\w+\}/g, '').length }
}).sort((a, b) => b.specificity - a.specificity)
