import {
  imageBlobToDataUrl,
  isAnimatedImageBlob,
  parseThemeBackgroundDataUrl,
  THEME_ASSET_ID_PATTERN
} from '../shared/background-image.js'

const DATABASE_NAME = 'markdown-plus-assets'
const DATABASE_VERSION = 1
const STORE_NAME = 'background-assets'

function validateAssetId(assetId) {
  const normalized = String(assetId || '').trim().toLowerCase()
  if (!THEME_ASSET_ID_PATTERN.test(normalized)) throw new Error('Invalid theme asset id.')
  return normalized
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Theme asset database request failed.'))
  })
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('Theme asset transaction failed.'))
    transaction.onabort = () => reject(transaction.error || new Error('Theme asset transaction was aborted.'))
  })
}

function openDatabase(indexedDb) {
  if (!indexedDb) return Promise.reject(new Error('Theme asset storage is unavailable.'))
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open theme asset storage.'))
  })
}

async function withStore(indexedDb, mode, operation) {
  const database = await openDatabase(indexedDb)
  try {
    const transaction = database.transaction(STORE_NAME, mode)
    const completion = mode === 'readwrite' ? transactionComplete(transaction) : null
    const result = await operation(transaction.objectStore(STORE_NAME), transaction)
    if (completion) await completion
    return result
  } finally {
    database.close()
  }
}

export function createThemeAssetService({ indexedDb = globalThis.indexedDB } = {}) {
  return {
    async saveThemeAsset({ assetId, dataUrl } = {}) {
      const id = validateAssetId(assetId)
      const blob = parseThemeBackgroundDataUrl(dataUrl)
      const record = {
        id,
        blob,
        animated: await isAnimatedImageBlob(blob)
      }
      await withStore(indexedDb, 'readwrite', (store) => requestResult(store.put(record)))
      return {
        assetId: id,
        animated: record.animated
      }
    },

    async getThemeAsset({ assetId } = {}) {
      const id = validateAssetId(assetId)
      const record = await withStore(indexedDb, 'readonly', (store) => requestResult(store.get(id)))
      if (!record?.blob) return null
      return {
        assetId: id,
        dataUrl: await imageBlobToDataUrl(record.blob),
        animated: record.animated === true
      }
    },

    async deleteThemeAsset({ assetId } = {}) {
      const id = validateAssetId(assetId)
      await withStore(indexedDb, 'readwrite', (store) => requestResult(store.delete(id)))
      return { assetId: id, deleted: true }
    },

    async clearThemeAssets() {
      await withStore(indexedDb, 'readwrite', (store) => requestResult(store.clear()))
      return { cleared: true }
    }
  }
}

export const themeAssetService = createThemeAssetService()
