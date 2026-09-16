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
  return normalized
}
