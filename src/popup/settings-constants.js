export const SETTINGS_TAB_IDS = {
  SETTINGS: 'settings',
  READER: 'reader',
  PLUGINS: 'plugins'
}

export const SETTINGS_TABS = [
  { id: SETTINGS_TAB_IDS.SETTINGS, label: 'Settings', icon: '\u2699', title: 'Extension settings' },
  { id: SETTINGS_TAB_IDS.READER, label: 'Reader', icon: '\u{1F4D6}', title: 'Reader UI' },
  { id: SETTINGS_TAB_IDS.PLUGINS, label: 'Plugins', icon: '\u{1F9E9}', title: 'Plugin toggles' }
]

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
