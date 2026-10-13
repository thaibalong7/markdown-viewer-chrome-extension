import { attachTooltip } from './dom-tooltip.js'

export const RESOLUTION_STEPS = Object.freeze(Array.from({ length: 29 }, (_, index) => 1 + index * 0.25))
export const MAX_BITMAP_SIDE = 16384
export const MAX_BITMAP_PIXELS = 32 * 1024 * 1024
let controlId = 0

export function getNextResolution(current, direction) {
  return direction > 0
    ? RESOLUTION_STEPS.find((step) => step > current + 0.0001) || RESOLUTION_STEPS.at(-1)
    : [...RESOLUTION_STEPS].reverse().find((step) => step < current - 0.0001) || RESOLUTION_STEPS[0]
}

export function getDefaultImageResolution(devicePixelRatio = 1) {
  const ratio = Math.min(2, Math.max(1, Number(devicePixelRatio) || 1))
  return RESOLUTION_STEPS.find((step) => step >= ratio)
}

export function getRasterDimensions({ width, height, resolution, baseResolution = 1 }) {
  const density = resolution / baseResolution
  const pixels = { width: Math.max(1, Math.round(width * density)), height: Math.max(1, Math.round(height * density)) }
  if (!Number.isFinite(density) || density <= 0 || !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 || pixels.width > MAX_BITMAP_SIDE || pixels.height > MAX_BITMAP_SIDE ||
      pixels.width * pixels.height > MAX_BITMAP_PIXELS) {
    throw new Error('Bitmap limit: 16,384 px per side or 32 Mi pixels total.')
  }
  return pixels
}

export function getMaxImageResolution(dimensions) {
  return [...RESOLUTION_STEPS].reverse().find((resolution) => {
    try {
      getRasterDimensions({ ...dimensions, resolution })
      return true
    } catch {
      return false
    }
  }) || 0
}

export function createResolutionControls({ buttonClass, onChange }) {
  const group = document.createElement('div')
  group.className = 'mdp-lightbox-resolution'
  group.hidden = true
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', 'Render resolution')
  const row = document.createElement('div')
  row.className = 'mdp-lightbox-resolution__row'
  const actions = document.createElement('div')
  actions.className = 'mdp-lightbox-resolution__actions'
  const steps = document.createElement('div')
  steps.className = 'mdp-lightbox-resolution__steps'
  const id = `mdp-resolution-${++controlId}`
  actions.id = `${id}-actions`
  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = `${buttonClass} mdp-lightbox-resolution__trigger`
  trigger.setAttribute('aria-controls', actions.id)
  const title = document.createElement('span')
  title.className = 'mdp-lightbox-resolution__title'
  title.textContent = 'Resolution'
  const label = document.createElement('span')
  label.className = 'mdp-lightbox-resolution__level'
  trigger.append(title, label)
  const status = document.createElement('span')
  status.className = 'mdp-lightbox-resolution__status'
  status.id = `${id}-status`
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  trigger.append(status)
  const advice = document.createElement('span')
  advice.className = 'mdp-lightbox-resolution__advice'
  advice.id = `${id}-advice`
  advice.textContent = 'Higher resolution uses more memory. Limit: 16,384 px per side / 32 Mi pixels.'
  advice.hidden = true
  trigger.setAttribute('aria-describedby', `${status.id} ${advice.id}`)
  const down = document.createElement('button')
  const up = document.createElement('button')
  for (const [button, text, name] of [[down, '− 0.25', 'Decrease render resolution'], [up, '+ 0.25', 'Increase render resolution']]) {
    button.type = 'button'
    button.className = `${buttonClass} mdp-lightbox-resolution__button`
    button.textContent = text
    button.setAttribute('aria-label', name)
    button.setAttribute('aria-describedby', `${status.id} ${advice.id}`)
  }
  down.setAttribute('data-direction', 'decrease')
  up.setAttribute('data-direction', 'increase')
  // Reveal to the left so the trigger and original zoom buttons stay in place.
  steps.append(down, up)
  actions.append(steps)
  row.append(actions, trigger)
  group.append(row, advice)
  let current = 1
  let generation = 0
  let busy = false
  let unavailable = false
  let maximum = RESOLUTION_STEPS.at(-1)
  let error = ''
  let hovered = false
  let expanded = false
  let tooltips = []
  // Pointer and keyboard focus can target different buttons; show only one tip.
  for (const [index, button] of [trigger, down, up].entries()) {
    const hideOtherTips = () => tooltips.forEach((tip, other) => {
      if (other !== index) tip.hide()
    })
    button.addEventListener('pointerenter', hideOtherTips)
    button.addEventListener('focusin', hideOtherTips)
  }
  function clearTooltips() {
    for (const tooltip of tooltips) tooltip.destroy()
    tooltips = []
  }
  function reveal(value) {
    expanded = value
    actions.inert = !value
    actions.setAttribute('aria-hidden', String(!value))
    down.tabIndex = up.tabIndex = value ? 0 : -1
    group.setAttribute('data-expanded', String(value))
    trigger.setAttribute('aria-expanded', String(value))
  }
  group.addEventListener('mouseenter', () => { hovered = true; reveal(true) })
  group.addEventListener('mouseleave', () => {
    hovered = false
    const keyboardFocus = group.contains(document.activeElement) && document.activeElement?.matches(':focus-visible')
    if (!keyboardFocus) reveal(false)
  })
  group.addEventListener('focusin', () => reveal(true))
  group.addEventListener('focusout', (event) => {
    if (!hovered && !group.contains(event.relatedTarget)) reveal(false)
  })
  // Pointer entry already reveals the controls; clicking must not undo it.
  trigger.addEventListener('click', (event) => reveal(event.detail === 0 ? !expanded : true))
  function update() {
    label.textContent = unavailable ? '—' : `×${current}`
    down.disabled = busy || unavailable || current <= RESOLUTION_STEPS[0]
    up.disabled = busy || unavailable || current >= maximum
    group.setAttribute('aria-busy', String(busy))
    const atLimit = !unavailable && current >= maximum
    title.textContent = unavailable ? 'Unavailable' : error ? 'Failed' : atLimit ? 'Maximum' : 'Resolution'
    status.textContent = unavailable ? 'N/A' : error ? 'Error' : busy ? 'Rendering' : atLimit ? 'Max' : ''
    status.hidden = !status.textContent
    group.setAttribute('data-state', error || unavailable ? 'error' : busy ? 'busy' : atLimit ? 'limit' : 'ready')
    const limit = atLimit ? `Maximum ×${maximum} for this image. ` : ''
    const descriptions = [
      `${error ? `${error} ` : ''}${limit}${advice.textContent}`,
      'Decrease resolution by 0.25',
      atLimit ? `${limit}Bitmap limit: 16,384 px per side / 32 Mi pixels.` : 'Increase resolution by 0.25'
    ]
    tooltips.forEach((tooltip, index) => tooltip.setText(busy ? '' : descriptions[index]))
    trigger.setAttribute('aria-label', `Adjust render resolution: ${unavailable ? 'Unavailable' : label.textContent}${busy ? ', rendering' : ''}${atLimit ? ', maximum for this image' : ''}${error ? `, ${error}` : ''}`)
  }
  reveal(false)
  for (const [button, direction] of [[down, -1], [up, 1]]) {
    button.addEventListener('click', async () => {
      if (!expanded || busy || unavailable || group.hidden || button.disabled) return
      const token = ++generation
      const next = getNextResolution(current, direction)
      const restoreFocus = document.activeElement === button && button.matches(':focus-visible')
      busy = true
      error = ''
      update()
      try {
        const applied = await onChange(next)
        if (token !== generation) return
        if (applied !== false) current = next
      } catch (failure) {
        if (token === generation) error = failure?.message || 'Could not render this resolution.'
      } finally {
        if (token === generation) {
          busy = false
          update()
          // Disabling a focused step button can send focus back to the page.
          if (restoreFocus && !group.hidden &&
              (document.activeElement === button || document.activeElement === document.body)) trigger.focus()
        }
      }
    })
  }
  return {
    group,
    setResolution(value, dimensions) {
      generation++
      busy = false
      unavailable = false
      error = ''
      hovered = false
      clearTooltips()
      reveal(false)
      group.hidden = value == null
      if (value == null) return null
      tooltips = [trigger, down, up].map((button) => attachTooltip(button, { text: 'Render resolution' }))
      maximum = dimensions ? getMaxImageResolution(dimensions) : RESOLUTION_STEPS.at(-1)
      unavailable = maximum === 0
      if (unavailable) error = 'Image exceeds bitmap limit: 16,384 px per side / 32 Mi pixels.'
      current = unavailable ? value : Math.min(value, maximum)
      update()
      return unavailable ? null : current
    },
    setBusy(value) {
      busy = value
      update()
    },
    setError(message, { disable = false } = {}) {
      error = message
      unavailable = disable
      update()
    },
    clearError() {
      error = ''
      update()
    }
  }
}
