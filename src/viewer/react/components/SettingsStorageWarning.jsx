import { useEffect } from 'react'
import { diagnosticMessage } from '../../../i18n/index.js'
import { useSettingsStorageWarning } from '../../../settings/useSettingsStorageWarning.js'
import { useToast } from '../contexts/ToastContext.jsx'

export function SettingsStorageWarning() {
  const warning = useSettingsStorageWarning()
  const { showToast } = useToast()
  useEffect(() => {
    if (warning) showToast(diagnosticMessage(warning), { variant: 'warning', durationMs: 7000 })
  }, [warning, showToast])
  return null
}
