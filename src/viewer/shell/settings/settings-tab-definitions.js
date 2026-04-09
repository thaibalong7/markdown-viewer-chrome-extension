export const SETTINGS_TAB_IDS = {
  SETTINGS: 'settings',
  READER: 'reader',
  PLUGINS: 'plugins'
}

/** Left-rail tabs: add panel content per tab in dedicated modules later. */
export const SETTINGS_TABS = [
  { id: SETTINGS_TAB_IDS.SETTINGS, label: 'Settings', icon: '\u2699', title: 'Extension settings' },
  { id: SETTINGS_TAB_IDS.READER, label: 'Reader', icon: '\u{1F4D6}', title: 'Reader UI' },
  { id: SETTINGS_TAB_IDS.PLUGINS, label: 'Plugins', icon: '\u{1F9E9}', title: 'Plugin toggles' }
]
