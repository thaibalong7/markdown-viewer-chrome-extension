export const STORAGE_ERRORS = Object.freeze({
  quota: 'Settings storage is full. Your previously saved settings have been kept.',
  rate: 'Changes are being saved too quickly. Please try again later.',
  pending: 'Settings are still syncing or could not be verified. Please wait and try again.',
  cached: 'Showing the last complete settings while Chrome Sync catches up. New changes cannot be saved yet.',
  unavailable: 'Settings storage is unavailable.'
})

export function storageError(kind) {
  return Object.assign(new Error(STORAGE_ERRORS[kind]), { code: `settings-storage-${kind}` })
}

export function normalizeStorageError(error) {
  const text = error instanceof Error ? error.message : String(error)
  if (/MAX_WRITE_OPERATIONS_PER_(MINUTE|HOUR)|MAX_SUSTAINED_WRITE_OPERATIONS/i.test(text)) {
    return storageError('rate')
  }
  if (/QUOTA_BYTES|MAX_ITEMS|Resource::k(QuotaBytes|QuotaBytesPerItem|MaxItems)/i.test(text)) {
    return storageError('quota')
  }
  return error instanceof Error ? error : new Error(text)
}
