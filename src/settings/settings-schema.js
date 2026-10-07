import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
  DEFAULT_EXPLORER_RESPECT_GITIGNORE,
  DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
} from '../shared/constants/explorer.js'
import {
  DEFAULT_HISTORY_ENABLED,
  DEFAULT_HISTORY_MAX_ENTRIES,
  MAX_HISTORY_MAX_ENTRIES,
  MIN_HISTORY_MAX_ENTRIES
} from '../shared/constants/history.js'
import {
  DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
  MAX_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
  MIN_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
} from '../shared/constants/documents.js'
import { deepMerge, isPlainObject } from '../shared/deep-merge.js'
import { THEME_ASSET_ID_PATTERN } from '../shared/background-image.js'
import {
  DEFAULT_EDITOR_ENABLED,
  DEFAULT_EDITOR_SETTINGS
} from '../shared/constants/editor.js'
import {
  BACKGROUND_IMAGE_FITS,
  BACKGROUND_IMAGE_POSITIONS,
  BACKGROUND_MOTION,
  BACKGROUND_TYPES,
  DEFAULT_THEME_BACKGROUND
} from '../theme/backgrounds.js'
import {
  BUILT_IN_THEMES,
  DEFAULT_THEME_SETTINGS,
  EDITABLE_THEME_COLOR_FIELDS,
  MAX_CUSTOM_THEMES,
  isBundledSyntaxThemeId
} from '../theme/index.js'
import {
  DEFAULT_SCROLLBAR_VISIBILITY,
  SCROLLBAR_VISIBILITY
} from '../shared/constants/scrollbar.js'
import { DEFAULT_SHOW_DOCUMENT_STATS } from '../shared/constants/document-stats.js'

export const EXPLORER_LIMIT_FIELDS = Object.freeze({
  maxScanDepth: Object.freeze({
    label: 'Folder scan depth',
    min: 0,
    max: 20,
    defaultValue: DEFAULT_EXPLORER_MAX_SCAN_DEPTH
  }),
  maxFiles: Object.freeze({
    label: 'Maximum indexed files',
    min: 10,
    max: 20_000,
    defaultValue: DEFAULT_EXPLORER_MAX_FILES
  }),
  maxFolders: Object.freeze({
    label: 'Maximum scanned folders',
    min: 1,
    max: 5_000,
    defaultValue: DEFAULT_EXPLORER_MAX_FOLDERS
  })
})

export const EXPLORER_BEHAVIOR_FIELDS = Object.freeze({
  respectGitignore: Object.freeze({
    label: 'Respect .gitignore files',
    defaultValue: DEFAULT_EXPLORER_RESPECT_GITIGNORE
  }),
  restoreLastWorkspace: Object.freeze({
    label: 'Restore last workspace',
    defaultValue: DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
  })
})

export const HISTORY_FIELDS = Object.freeze({
  enabled: Object.freeze({
    label: 'Save recent files',
    defaultValue: DEFAULT_HISTORY_ENABLED
  }),
  maxEntries: Object.freeze({
    label: 'Maximum recent files',
    min: MIN_HISTORY_MAX_ENTRIES,
    max: MAX_HISTORY_MAX_ENTRIES,
    defaultValue: DEFAULT_HISTORY_MAX_ENTRIES
  })
})

export const DOCUMENT_FIELDS = Object.freeze({
  maxStandaloneTextFileSizeMiB: Object.freeze({
    label: 'Standalone text file limit',
    min: MIN_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
    max: MAX_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB,
    defaultValue: DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
  })
})

const VALID_BACKGROUND_TYPES = new Set(Object.values(BACKGROUND_TYPES))
const VALID_BACKGROUND_MOTION = new Set(Object.values(BACKGROUND_MOTION))
const VALID_BACKGROUND_FITS = new Set(Object.values(BACKGROUND_IMAGE_FITS))
const VALID_BACKGROUND_POSITIONS = new Set(Object.values(BACKGROUND_IMAGE_POSITIONS))
const VALID_SCROLLBAR_VISIBILITY = new Set(Object.values(SCROLLBAR_VISIBILITY))
const EDITABLE_COLOR_KEYS = new Set(EDITABLE_THEME_COLOR_FIELDS.map(({ key }) => key))
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const CUSTOM_THEME_ID_PATTERN = /^custom:[a-z0-9][a-z0-9-]{7,127}$/

function defaultCustomBackground() {
  return { ...DEFAULT_THEME_BACKGROUND }
}

function normalizeColor(value, fieldPath, invalidPolicy, fallback) {
  const normalized = String(value || '').trim().toLowerCase()
  if (HEX_COLOR_PATTERN.test(normalized)) return normalized
  if (invalidPolicy === 'default') return fallback
  throw new SettingsValidationError({ [fieldPath]: 'Choose a valid hexadecimal color.' })
}

export function normalizeBackgroundSettings(background, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  const path = options.path || 'theme.background'
  if (!isPlainObject(background)) {
    if (invalidPolicy === 'default') return defaultCustomBackground()
    throw new SettingsValidationError({ [path]: 'Background settings must be an object.' })
  }

  const type = VALID_BACKGROUND_TYPES.has(background.type)
    ? background.type
    : DEFAULT_THEME_BACKGROUND.type
  if (background.type !== undefined && !VALID_BACKGROUND_TYPES.has(background.type) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ [`${path}.type`]: 'Choose a supported background type.' })
  }
  const motion = VALID_BACKGROUND_MOTION.has(background.motion)
    ? background.motion
    : DEFAULT_THEME_BACKGROUND.motion
  if (background.motion !== undefined && !VALID_BACKGROUND_MOTION.has(background.motion) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ [`${path}.motion`]: 'Choose a supported background motion policy.' })
  }
  const opacity = Number(background.overlayOpacity ?? DEFAULT_THEME_BACKGROUND.overlayOpacity)
  if ((!Number.isFinite(opacity) || opacity < 0 || opacity > 0.8) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ [`${path}.overlayOpacity`]: 'Background dimming must be between 0 and 0.8.' })
  }
  const normalized = {
    type,
    motion,
    overlayOpacity: Number.isFinite(opacity) && opacity >= 0 && opacity <= 0.8
      ? opacity
      : DEFAULT_THEME_BACKGROUND.overlayOpacity
  }

  if (type === BACKGROUND_TYPES.SOLID) {
    normalized.color = normalizeColor(background.color, `${path}.color`, invalidPolicy, '#111827')
  } else if (type === BACKGROUND_TYPES.GRADIENT) {
    if (background.variant === 'aurora') {
      normalized.variant = 'aurora'
    } else {
      normalized.startColor = normalizeColor(
        background.startColor,
        `${path}.startColor`,
        invalidPolicy,
        '#312e81'
      )
      normalized.endColor = normalizeColor(
        background.endColor,
        `${path}.endColor`,
        invalidPolicy,
        '#0f766e'
      )
      const angle = Number(background.angle ?? 135)
      if ((!Number.isFinite(angle) || angle < 0 || angle > 360) && invalidPolicy !== 'default') {
        throw new SettingsValidationError({ [`${path}.angle`]: 'Gradient angle must be between 0 and 360.' })
      }
      normalized.angle = Number.isFinite(angle) && angle >= 0 && angle <= 360 ? angle : 135
    }
  } else if (type === BACKGROUND_TYPES.IMAGE) {
    if (!THEME_ASSET_ID_PATTERN.test(String(background.assetId || ''))) {
      if (invalidPolicy === 'default') return defaultCustomBackground()
      throw new SettingsValidationError({ [`${path}.assetId`]: 'Choose an image for this theme.' })
    }
    normalized.assetId = background.assetId
    const revision = Number(background.assetRevision ?? 0)
    if ((!Number.isSafeInteger(revision) || revision < 0) && invalidPolicy !== 'default') {
      throw new SettingsValidationError({ [`${path}.assetRevision`]: 'Background asset revision is invalid.' })
    }
    normalized.assetRevision = Number.isSafeInteger(revision) && revision >= 0 ? revision : 0
    normalized.fit = VALID_BACKGROUND_FITS.has(background.fit)
      ? background.fit
      : BACKGROUND_IMAGE_FITS.COVER
    normalized.position = VALID_BACKGROUND_POSITIONS.has(background.position)
      ? background.position
      : BACKGROUND_IMAGE_POSITIONS.CENTER
    normalized.repeat = background.repeat === true
  }
  return normalized
}

function normalizeCustomTheme(theme, index, invalidPolicy) {
  const path = `theme.customThemes.${index}`
  if (!isPlainObject(theme)) {
    throw new SettingsValidationError({ [path]: 'Custom theme must be an object.' })
  }
  const id = String(theme.id || '').trim().toLowerCase()
  if (!CUSTOM_THEME_ID_PATTERN.test(id)) {
    throw new SettingsValidationError({ [`${path}.id`]: 'Custom theme id is invalid.' })
  }
  const name = String(theme.name || '').trim()
  if (!name || name.length > 48) {
    throw new SettingsValidationError({ [`${path}.name`]: 'Theme name must be between 1 and 48 characters.' })
  }
  const baseId = Object.hasOwn(BUILT_IN_THEMES, theme.baseId)
    ? theme.baseId
    : DEFAULT_THEME_SETTINGS.activeId
  if (!Object.hasOwn(BUILT_IN_THEMES, theme.baseId) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ [`${path}.baseId`]: 'Choose a built-in base theme.' })
  }
  const requestedSyntaxThemeId = theme.syntaxThemeId
  const inheritsSyntaxTheme = requestedSyntaxThemeId === undefined ||
    requestedSyntaxThemeId === null || requestedSyntaxThemeId === ''
  if (!inheritsSyntaxTheme && !isBundledSyntaxThemeId(requestedSyntaxThemeId) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({
      [`${path}.syntaxThemeId`]: 'Choose a bundled code highlighting theme.'
    })
  }
  const syntaxThemeId = !inheritsSyntaxTheme && isBundledSyntaxThemeId(requestedSyntaxThemeId)
    ? requestedSyntaxThemeId
    : null
  const inputColors = isPlainObject(theme.colors) ? theme.colors : {}
  if (!isPlainObject(theme.colors) && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ [`${path}.colors`]: 'Theme colors must be an object.' })
  }
  const colors = {}
  for (const key of EDITABLE_COLOR_KEYS) {
    if (inputColors[key] === undefined) continue
    colors[key] = normalizeColor(
      inputColors[key],
      `${path}.colors.${key}`,
      invalidPolicy,
      BUILT_IN_THEMES[baseId][key]
    )
  }
  return {
    id,
    name,
    baseId,
    syntaxThemeId,
    colors,
    background: normalizeBackgroundSettings(theme.background || DEFAULT_THEME_BACKGROUND, {
      invalid: invalidPolicy,
      path: `${path}.background`
    })
  }
}

export function normalizeThemeSettings(theme, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  if (!isPlainObject(theme)) {
    if (invalidPolicy === 'default') return { activeId: DEFAULT_THEME_SETTINGS.activeId, customThemes: [] }
    throw new SettingsValidationError({ theme: 'Theme settings must be an object.' })
  }
  const sourceThemes = theme.customThemes === undefined ? [] : theme.customThemes
  if (!Array.isArray(sourceThemes)) {
    if (invalidPolicy !== 'default') {
      throw new SettingsValidationError({ 'theme.customThemes': 'Custom themes must be a list.' })
    }
  }
  const customThemes = []
  for (const [index, candidate] of (Array.isArray(sourceThemes) ? sourceThemes : []).entries()) {
    if (customThemes.length >= MAX_CUSTOM_THEMES) {
      if (invalidPolicy !== 'default') {
        throw new SettingsValidationError({ 'theme.customThemes': `You can save up to ${MAX_CUSTOM_THEMES} custom themes.` })
      }
      break
    }
    try {
      const normalizedTheme = normalizeCustomTheme(candidate, index, invalidPolicy)
      if (customThemes.some(({ id }) => id === normalizedTheme.id)) {
        if (invalidPolicy !== 'default') {
          throw new SettingsValidationError({ [`theme.customThemes.${index}.id`]: 'Custom theme ids must be unique.' })
        }
        continue
      }
      customThemes.push(normalizedTheme)
    } catch (error) {
      if (invalidPolicy !== 'default') throw error
    }
  }
  const legacyPreset = typeof theme.preset === 'string' ? theme.preset : null
  const requestedActiveId = String(theme.activeId || legacyPreset || DEFAULT_THEME_SETTINGS.activeId)
  const activeExists = Object.hasOwn(BUILT_IN_THEMES, requestedActiveId) ||
    customThemes.some(({ id }) => id === requestedActiveId)
  if (!activeExists && invalidPolicy !== 'default') {
    throw new SettingsValidationError({ 'theme.activeId': 'Choose an available theme.' })
  }
  return {
    activeId: activeExists ? requestedActiveId : DEFAULT_THEME_SETTINGS.activeId,
    customThemes
  }
}

export function normalizeAppearanceSettings(appearance, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  if (!isPlainObject(appearance)) {
    if (invalidPolicy === 'default') {
      return {
        scrollbarVisibility: DEFAULT_SCROLLBAR_VISIBILITY,
        showDocumentStats: DEFAULT_SHOW_DOCUMENT_STATS
      }
    }
    throw new SettingsValidationError({ appearance: 'Appearance settings must be an object.' })
  }
  const normalized = { ...appearance }
  delete normalized.background
  if (invalidPolicy === 'default' && appearance.scrollbarVisibility === undefined) {
    normalized.scrollbarVisibility = DEFAULT_SCROLLBAR_VISIBILITY
  }
  if (
    appearance.scrollbarVisibility !== undefined &&
    !VALID_SCROLLBAR_VISIBILITY.has(appearance.scrollbarVisibility)
  ) {
    if (invalidPolicy === 'default') {
      normalized.scrollbarVisibility = DEFAULT_SCROLLBAR_VISIBILITY
    } else {
      throw new SettingsValidationError({
        'appearance.scrollbarVisibility': 'Choose auto-hide or always-visible scrollbars.'
      })
    }
  }
  if (invalidPolicy === 'default' && appearance.showDocumentStats === undefined) {
    normalized.showDocumentStats = DEFAULT_SHOW_DOCUMENT_STATS
  }
  if (
    appearance.showDocumentStats !== undefined &&
    typeof appearance.showDocumentStats !== 'boolean'
  ) {
    if (invalidPolicy === 'default') {
      normalized.showDocumentStats = DEFAULT_SHOW_DOCUMENT_STATS
    } else {
      throw new SettingsValidationError({
        'appearance.showDocumentStats': 'Show document statistics must be true or false.'
      })
    }
  }
  return normalized
}

export class SettingsValidationError extends Error {
  constructor(fieldErrors) {
    const firstMessage = Object.values(fieldErrors)[0] || 'Settings are invalid.'
    super(firstMessage)
    this.name = 'SettingsValidationError'
    this.fieldErrors = fieldErrors
  }
}

function normalizeInteger(value, definition) {
  const normalizedValue = typeof value === 'string' && value.trim() !== '' ? Number(value) : value

  if (!Number.isFinite(normalizedValue) || !Number.isInteger(normalizedValue)) {
    return {
      error: `${definition.label} must be a whole number.`
    }
  }

  if (normalizedValue < definition.min || normalizedValue > definition.max) {
    return {
      error: `${definition.label} must be between ${definition.min.toLocaleString()} and ${definition.max.toLocaleString()}.`
    }
  }

  return { value: normalizedValue }
}

/**
 * Normalize the explorer limits and behavior policies used by scan/startup paths.
 *
 * @param {unknown} explorer
 * @param {{ invalid?: 'throw' | 'default' }} options
 */
export function normalizeExplorerSettings(explorer, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  const input = isPlainObject(explorer) ? explorer : {}
  const normalized = { ...input }
  const fieldErrors = {}

  if (!isPlainObject(explorer) && explorer !== undefined) {
    if (invalidPolicy === 'default') {
      return Object.fromEntries(
        [...Object.entries(EXPLORER_LIMIT_FIELDS), ...Object.entries(EXPLORER_BEHAVIOR_FIELDS)].map(
          ([field, definition]) => [field, definition.defaultValue]
        )
      )
    }
    fieldErrors.explorer = 'Files & Workspace settings must be an object.'
  }

  for (const [field, definition] of Object.entries(EXPLORER_LIMIT_FIELDS)) {
    const rawValue = input[field]
    if (rawValue === undefined) continue
    const result = normalizeInteger(rawValue, definition)

    if (result.error) {
      if (invalidPolicy === 'default') {
        normalized[field] = definition.defaultValue
      } else {
        fieldErrors[`explorer.${field}`] = result.error
      }
    } else {
      normalized[field] = result.value
    }
  }

  for (const [field, definition] of Object.entries(EXPLORER_BEHAVIOR_FIELDS)) {
    const rawValue = input[field]
    if (rawValue === undefined) continue

    if (typeof rawValue !== 'boolean') {
      if (invalidPolicy === 'default') {
        normalized[field] = definition.defaultValue
      } else {
        fieldErrors[`explorer.${field}`] = `${definition.label} must be true or false.`
      }
    } else {
      normalized[field] = rawValue
    }
  }

  if (Object.keys(fieldErrors).length > 0 && invalidPolicy !== 'default') {
    throw new SettingsValidationError(fieldErrors)
  }

  return normalized
}

/**
 * Normalize the local file-history retention policy stored with settings.
 * The history entries themselves are kept separately in chrome.storage.local.
 *
 * @param {unknown} history
 * @param {{ invalid?: 'throw' | 'default' }} options
 */
export function normalizeHistorySettings(history, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  const input = isPlainObject(history) ? history : {}
  const normalized = { ...input }
  const fieldErrors = {}

  if (!isPlainObject(history) && history !== undefined) {
    if (invalidPolicy === 'default') {
      return Object.fromEntries(
        Object.entries(HISTORY_FIELDS).map(([field, definition]) => [
          field,
          definition.defaultValue
        ])
      )
    }
    fieldErrors.history = 'Privacy & Data settings must be an object.'
  }

  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') {
      if (invalidPolicy === 'default') normalized.enabled = HISTORY_FIELDS.enabled.defaultValue
      else fieldErrors['history.enabled'] = `${HISTORY_FIELDS.enabled.label} must be true or false.`
    } else {
      normalized.enabled = input.enabled
    }
  }

  if (input.maxEntries !== undefined) {
    const result = normalizeInteger(input.maxEntries, HISTORY_FIELDS.maxEntries)
    if (result.error) {
      if (invalidPolicy === 'default') {
        normalized.maxEntries = HISTORY_FIELDS.maxEntries.defaultValue
      } else {
        fieldErrors['history.maxEntries'] = result.error
      }
    } else {
      normalized.maxEntries = result.value
    }
  }

  if (Object.keys(fieldErrors).length > 0 && invalidPolicy !== 'default') {
    throw new SettingsValidationError(fieldErrors)
  }

  return normalized
}

/**
 * Normalize resource limits for standalone text-like documents.
 *
 * @param {unknown} documents
 * @param {{ invalid?: 'throw' | 'default' }} options
 */
export function normalizeDocumentSettings(documents, options = {}) {
  const invalidPolicy = options.invalid || 'throw'
  const input = isPlainObject(documents) ? documents : {}
  const normalized = { ...input }
  const fieldErrors = {}

  if (!isPlainObject(documents) && documents !== undefined) {
    if (invalidPolicy === 'default') {
      return Object.fromEntries(
        Object.entries(DOCUMENT_FIELDS).map(([field, definition]) => [
          field,
          definition.defaultValue
        ])
      )
    }
    fieldErrors.documents = 'Document settings must be an object.'
  }

  for (const [field, definition] of Object.entries(DOCUMENT_FIELDS)) {
    const rawValue = input[field]
    if (rawValue === undefined) continue
    const result = normalizeInteger(rawValue, definition)

    if (result.error) {
      if (invalidPolicy === 'default') normalized[field] = definition.defaultValue
      else fieldErrors[`documents.${field}`] = result.error
    } else {
      normalized[field] = result.value
    }
  }

  if (Object.keys(fieldErrors).length > 0 && invalidPolicy !== 'default') {
    throw new SettingsValidationError(fieldErrors)
  }

  return normalized
}

/**
 * Clone and normalize the settings fields guarded by the shared schema.
 * Unknown fields are preserved so additive settings remain forward compatible.
 *
 * @param {unknown} settings
 * @param {{ invalid?: 'throw' | 'default' }} options
 */
export function normalizeSettings(settings, options = {}) {
  if (!isPlainObject(settings)) {
    throw new SettingsValidationError({ settings: 'Settings must be a JSON object.' })
  }

  const invalidPolicy = options.invalid || 'throw'
  const normalized = deepMerge({}, settings)

  if (normalized.enabled !== undefined && typeof normalized.enabled !== 'boolean') {
    if (invalidPolicy === 'default') normalized.enabled = true
    else {
      throw new SettingsValidationError({
        enabled: 'Enable Markdown Plus must be true or false.'
      })
    }
  }

  if (Object.hasOwn(normalized, 'editor')) {
    if (!isPlainObject(normalized.editor)) {
      if (invalidPolicy === 'default') normalized.editor = { ...DEFAULT_EDITOR_SETTINGS }
      else {
        throw new SettingsValidationError({
          editor: 'Editor settings must be an object.'
        })
      }
    } else if (
      normalized.editor.enabled !== undefined &&
      typeof normalized.editor.enabled !== 'boolean'
    ) {
      if (invalidPolicy === 'default') normalized.editor.enabled = DEFAULT_EDITOR_ENABLED
      else {
        throw new SettingsValidationError({
          'editor.enabled': 'Enable experimental editor must be true or false.'
        })
      }
    }
  }

  if (Object.hasOwn(normalized, 'watch')) {
    const valid = isPlainObject(normalized.watch) &&
      (normalized.watch.mode === undefined || ['auto', 'ask', 'off'].includes(normalized.watch.mode))
    if (!valid && invalidPolicy !== 'default') {
      throw new SettingsValidationError({ 'watch.mode': 'Choose automatic, ask before updating, or off.' })
    }
    normalized.watch = { mode: valid ? normalized.watch.mode ?? 'ask' : 'ask' }
  }

  if (Object.hasOwn(normalized, 'theme')) {
    normalized.theme = normalizeThemeSettings(normalized.theme, { invalid: invalidPolicy })
  }

  if (Object.hasOwn(normalized, 'explorer')) {
    normalized.explorer = normalizeExplorerSettings(normalized.explorer, { invalid: invalidPolicy })
  }
  if (Object.hasOwn(normalized, 'history')) {
    normalized.history = normalizeHistorySettings(normalized.history, { invalid: invalidPolicy })
  }
  if (Object.hasOwn(normalized, 'documents')) {
    normalized.documents = normalizeDocumentSettings(normalized.documents, {
      invalid: invalidPolicy
    })
  }
  if (Object.hasOwn(normalized, 'appearance')) {
    normalized.appearance = normalizeAppearanceSettings(normalized.appearance, {
      invalid: invalidPolicy
    })
  }
  return normalized
}
