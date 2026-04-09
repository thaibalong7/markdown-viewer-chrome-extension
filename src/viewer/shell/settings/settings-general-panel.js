/** Presets: label in UI, value is full CSS font-family (persisted). */
export const FONT_FAMILY_PRESETS = [
  {
    label: 'System UI',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  { label: 'Sans (neutral)', value: 'ui-sans-serif, system-ui, sans-serif' },
  {
    label: 'Sans (Readable / Vietnamese)',
    value: '"Noto Sans", "Inter", "Segoe UI", Roboto, Arial, sans-serif'
  },
  {
    label: 'Sans (Roboto / Arial)',
    value: 'Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  {
    label: 'Sans (Open Sans)',
    value: '"Open Sans", "Segoe UI", Arial, sans-serif'
  },
  {
    label: 'Monospace (Fira Code)',
    value: '"Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  },
  { label: 'Sans (Humanist)', value: 'Verdana, Geneva, sans-serif' },
  {
    label: 'Serif (Georgia)',
    value: 'Georgia, "Times New Roman", "Times", serif'
  },
  {
    label: 'Serif (Noto / Vietnamese)',
    value: '"Noto Serif", "Times New Roman", Times, serif'
  },
  {
    label: 'Serif (Merriweather)',
    value: 'Merriweather, Georgia, "Times New Roman", serif'
  },
  {
    label: 'Serif (Source Serif)',
    value: '"Source Serif 4", "Source Serif Pro", Georgia, serif'
  },
  {
    label: 'Serif (Charter)',
    value: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif'
  },
  {
    label: 'Monospace',
    value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
  },
  {
    label: 'Serif (New York / Georgia)',
    value: '"New York", "Georgia Pro", Georgia, "Times New Roman", serif'
  }
]

export function buildGeneralSettingsPanel({ settings, onChange }) {
  const root = document.createElement('div')
  root.className = 'mdp-settings__tab-panel-inner'

  const enabledField = document.createElement('label')
  enabledField.className = 'mdp-settings__field mdp-settings__field--inline'
  const enabledInput = document.createElement('input')
  enabledInput.type = 'checkbox'
  enabledInput.checked = settings?.enabled !== false
  const enabledLabel = document.createElement('span')
  enabledLabel.className = 'mdp-settings__label'
  enabledLabel.textContent = 'Enable Markdown Plus on markdown pages'
  enabledField.appendChild(enabledInput)
  enabledField.appendChild(enabledLabel)

  root.appendChild(enabledField)

  const emitEnabledChange = () => {
    if (typeof onChange !== 'function') return
    onChange({ enabled: enabledInput.checked })
  }

  enabledInput.addEventListener('change', emitEnabledChange)

  const api = {
    element: root,
    update(nextSettings) {
      enabledInput.checked = nextSettings?.enabled !== false
    },
    destroy() {
      enabledInput.removeEventListener('change', emitEnabledChange)
    }
  }

  return api
}
