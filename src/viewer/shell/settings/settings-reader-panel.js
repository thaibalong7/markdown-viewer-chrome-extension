import { BUILT_IN_THEMES } from '../../../theme/index.js'
import { FONT_FAMILY_PRESETS } from './settings-general-panel.js'

function createField({ label, input }) {
  const wrapper = document.createElement('label')
  wrapper.className = 'mdp-settings__field'
  const labelElement = document.createElement('span')
  labelElement.className = 'mdp-settings__label'
  labelElement.textContent = label
  wrapper.appendChild(labelElement)
  wrapper.appendChild(input)
  return wrapper
}

function createNumberInput({ min, max, step, value }) {
  const input = document.createElement('input')
  input.className = 'mdp-settings__input'
  input.type = 'number'
  if (min != null) input.min = String(min)
  if (max != null) input.max = String(max)
  if (step != null) input.step = String(step)
  input.value = String(value)
  return input
}

function createThemePresetSelect(value) {
  const select = document.createElement('select')
  select.className = 'mdp-settings__input'
  const themeLabels = {
    light: 'Light (Basic)',
    dark: 'Dark (Basic)',
    'vscode-light-plus': 'VS Code Light+',
    'vscode-dark-plus': 'VS Code Dark+'
  }
  for (const preset of Object.keys(BUILT_IN_THEMES)) {
    const option = document.createElement('option')
    option.value = preset
    option.textContent = themeLabels[preset] || preset
    option.selected = preset === value
    select.appendChild(option)
  }
  return select
}

function createFontFamilySelect(value) {
  const select = document.createElement('select')
  select.className = 'mdp-settings__input'
  for (const preset of FONT_FAMILY_PRESETS) {
    const option = document.createElement('option')
    option.value = preset.value
    option.textContent = preset.label
    option.selected = preset.value === value
    select.appendChild(option)
  }
  return select
}

export function buildReaderSettingsPanel({ settings, onChange, onReset }) {
  const root = document.createElement('div')
  root.className = 'mdp-settings__tab-panel-inner'

  const presetSelect = createThemePresetSelect(settings?.theme?.preset || 'light')
  const fontFamilySelect = createFontFamilySelect(settings?.typography?.fontFamily || FONT_FAMILY_PRESETS[0].value)
  const fontSizeInput = createNumberInput({ min: 12, max: 28, step: 1, value: settings?.typography?.fontSize || 16 })
  const lineHeightInput = createNumberInput({
    min: 1.2,
    max: 2.2,
    step: 0.1,
    value: settings?.typography?.lineHeight || 1.7
  })
  const widthInput = createNumberInput({
    min: 640,
    max: 1400,
    step: 10,
    value: settings?.layout?.contentMaxWidth || 980
  })

  const showTocField = document.createElement('label')
  showTocField.className = 'mdp-settings__field mdp-settings__field--inline'
  const showTocInput = document.createElement('input')
  showTocInput.type = 'checkbox'
  showTocInput.checked = settings?.layout?.showToc !== false
  const showTocLabel = document.createElement('span')
  showTocLabel.className = 'mdp-settings__label'
  showTocLabel.textContent = 'Show table of contents'
  showTocField.appendChild(showTocInput)
  showTocField.appendChild(showTocLabel)

  root.appendChild(createField({ label: 'Theme', input: presetSelect }))
  root.appendChild(createField({ label: 'Font family', input: fontFamilySelect }))
  root.appendChild(createField({ label: 'Font size (px)', input: fontSizeInput }))
  root.appendChild(createField({ label: 'Line height', input: lineHeightInput }))
  root.appendChild(createField({ label: 'Content width (px)', input: widthInput }))
  root.appendChild(showTocField)

  const actions = document.createElement('div')
  actions.className = 'mdp-settings__actions'
  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.className = 'mdp-button mdp-settings__reset'
  resetButton.textContent = 'Reset reader UI'
  actions.appendChild(resetButton)
  root.appendChild(actions)

  const emitChange = () => {
    if (typeof onChange !== 'function') return
    onChange({
      theme: { preset: presetSelect.value },
      typography: {
        fontFamily: fontFamilySelect.value || FONT_FAMILY_PRESETS[0].value,
        fontSize: Number(fontSizeInput.value) || 16,
        lineHeight: Number(lineHeightInput.value) || 1.7
      },
      layout: {
        contentMaxWidth: Number(widthInput.value) || 980,
        showToc: showTocInput.checked
      }
    })
  }

  presetSelect.addEventListener('change', emitChange)
  fontFamilySelect.addEventListener('change', emitChange)
  fontSizeInput.addEventListener('input', emitChange)
  lineHeightInput.addEventListener('input', emitChange)
  widthInput.addEventListener('input', emitChange)
  showTocInput.addEventListener('change', emitChange)

  const onResetClick = () => {
    const ok = window.confirm('Reset reader UI settings to default values?')
    if (!ok) return
    if (typeof onReset === 'function') onReset()
  }
  resetButton.addEventListener('click', onResetClick)

  return {
    element: root,
    update(nextSettings) {
      presetSelect.value = String(nextSettings?.theme?.preset || 'light')
      fontFamilySelect.value = String(nextSettings?.typography?.fontFamily || FONT_FAMILY_PRESETS[0].value)
      fontSizeInput.value = String(nextSettings?.typography?.fontSize || 16)
      lineHeightInput.value = String(nextSettings?.typography?.lineHeight || 1.7)
      widthInput.value = String(nextSettings?.layout?.contentMaxWidth || 980)
      showTocInput.checked = nextSettings?.layout?.showToc !== false
    },
    destroy() {
      presetSelect.removeEventListener('change', emitChange)
      fontFamilySelect.removeEventListener('change', emitChange)
      fontSizeInput.removeEventListener('input', emitChange)
      lineHeightInput.removeEventListener('input', emitChange)
      widthInput.removeEventListener('input', emitChange)
      showTocInput.removeEventListener('change', emitChange)
      resetButton.removeEventListener('click', onResetClick)
    }
  }
}
