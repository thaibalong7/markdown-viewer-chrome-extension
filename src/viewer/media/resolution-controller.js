import { t, translateMessage, subscribeLocale } from '../../i18n/index.js'
import { attachTooltip } from '../dom-tooltip.js'
import { mountContentUi } from '../react/content/mount-content-ui.jsx'
import { ResolutionControls } from '../react/content/media/ResolutionControls.jsx'
import { RESOLUTION_STEPS, getNextResolution, getMaxImageResolution } from './resolution-model.js'

let controlId = 0

/** Density policy and asynchronous guards; JSX lives in ResolutionControls. */
export function createResolutionControls({ buttonClass, onChange, target = document.body }) {
  const id = `mdp-resolution-${++controlId}`
  const nodes = {}
  const refs = Object.fromEntries(['group', 'trigger', 'down', 'up'].map(name => [name, node => { nodes[name] = node }]))
  let generation = 0
  let destroyed = false
  let hovered = false
  let tooltips = []
  let ui
  const state = { hidden: true, expanded: false, current: 1, busy: false, unavailable: false, maximum: 8, error: '' }
  const advice = 'viewer.media.higherResolutionUsesMoreMemoryLimit16384'
  const publish = () => {
    if (destroyed) return
    ui?.update(props())
    const atLimit = !state.unavailable && state.current >= state.maximum
    const limit = atLimit ? t('viewer.media.maximumValueForThisImage', { 0: state.maximum }) : ''
    const descriptions = [`${state.error ? `${translateMessage(state.error)} ` : ''}${limit}${t(advice)}`, t('viewer.media.decreaseResolutionBy025'), atLimit ? `${limit}${t('viewer.media.bitmapLimit16384PxPerSide32')}` : t('viewer.media.increaseResolutionBy025')]
    tooltips.forEach((tooltip, index) => tooltip.setText(state.busy ? '' : descriptions[index]))
  }
  const reveal = value => { state.expanded = value; publish() }
  const clearTooltips = () => { tooltips.forEach(tip => tip.destroy()); tooltips = [] }
  async function step(direction, button) {
    if (destroyed || !state.expanded || state.busy || state.unavailable || state.hidden || button.disabled) return
    const token = ++generation
    const next = getNextResolution(state.current, direction)
    const doc = button.ownerDocument
    const restoreFocus = doc.activeElement === button && button.matches(':focus-visible')
    state.busy = true
    state.error = ''
    publish()
    try {
      const applied = await onChange(next)
      if (token !== generation || destroyed) return
      if (applied !== false) state.current = next
    } catch (failure) {
      if (token === generation && !destroyed) state.error = failure?.message || 'errors.viewer.media.renderThisResolution'
    } finally {
      if (token === generation && !destroyed) {
        state.busy = false
        publish()
        if (restoreFocus && !state.hidden && (doc.activeElement === button || doc.activeElement === doc.body)) nodes.trigger.focus()
      }
    }
  }
  function props() {
    return { id, buttonClass, state: { ...state }, refs, onStep: step,
      onEnter: () => { hovered = true; reveal(true) },
      onLeave: () => { hovered = false; const focus = nodes.group.ownerDocument.activeElement; if (!nodes.group.contains(focus) || !focus?.matches(':focus-visible')) reveal(false) },
      onFocus: () => reveal(true),
      onBlur: event => { if (!hovered && !nodes.group.contains(event.relatedTarget)) reveal(false) },
      onToggle: event => reveal(event.detail === 0 ? !state.expanded : true) }
  }
  ui = mountContentUi(target, ResolutionControls, props())
  const unsubscribeLocale = subscribeLocale(publish)
  const hideHandlers = [nodes.trigger, nodes.down, nodes.up].map((button, index) => {
    const hide = () => tooltips.forEach((tip, other) => { if (index !== other) tip.hide() })
    button.addEventListener('pointerenter', hide)
    button.addEventListener('focusin', hide)
    return () => { button.removeEventListener('pointerenter', hide); button.removeEventListener('focusin', hide) }
  })
  return {
    get group() { return nodes.group },
    setResolution(value, dimensions) {
      if (destroyed) return null
      generation++
      Object.assign(state, { hidden: value == null, busy: false, unavailable: false, error: '', expanded: false })
      hovered = false
      clearTooltips()
      if (value == null) { publish(); return null }
      tooltips = [nodes.trigger, nodes.down, nodes.up].map(button => attachTooltip(button, { text: 'viewer.media.resolution.label' }))
      state.maximum = dimensions ? getMaxImageResolution(dimensions) : RESOLUTION_STEPS.at(-1)
      state.unavailable = state.maximum === 0
      if (state.unavailable) state.error = 'viewer.media.imageExceedsBitmapLimit16384PxPer'
      state.current = state.unavailable ? value : Math.min(value, state.maximum)
      publish()
      return state.unavailable ? null : state.current
    },
    setBusy(value) { state.busy = value; publish() },
    setError(message, { disable = false } = {}) { state.error = message; state.unavailable = disable; publish() },
    clearError() { state.error = ''; publish() },
    destroy() {
      if (destroyed) return
      destroyed = true
      generation++
      clearTooltips()
      unsubscribeLocale()
      hideHandlers.forEach(cleanup => cleanup())
      ui.destroy()
    }
  }
}
