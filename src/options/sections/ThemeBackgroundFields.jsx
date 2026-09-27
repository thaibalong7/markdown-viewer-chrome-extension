import React from 'react'
import { Switch } from '../../shared/react/Switch.jsx'
import {
  BACKGROUND_IMAGE_FITS,
  BACKGROUND_IMAGE_POSITIONS,
  BACKGROUND_MOTION,
  BACKGROUND_TYPES,
  DEFAULT_THEME_BACKGROUND
} from '../../theme/backgrounds.js'

function colorPickerValue(value, fallback = '#000000') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

function backgroundForType(type, draft) {
  const current = draft.background || DEFAULT_THEME_BACKGROUND
  const shared = {
    type,
    motion: current.motion || BACKGROUND_MOTION.SYSTEM,
    overlayOpacity: Number(current.overlayOpacity ?? DEFAULT_THEME_BACKGROUND.overlayOpacity)
  }
  if (type === BACKGROUND_TYPES.SOLID) {
    return { ...shared, color: current.color || draft.colors.background || '#111827' }
  }
  if (type === BACKGROUND_TYPES.GRADIENT) {
    return {
      ...shared,
      angle: Number(current.angle ?? 135),
      startColor: current.startColor || draft.colors.background || '#312e81',
      endColor: current.endColor || draft.colors.accent || '#0f766e'
    }
  }
  if (type === BACKGROUND_TYPES.IMAGE) {
    return {
      ...shared,
      ...(current.assetId ? {
        assetId: current.assetId,
        assetRevision: current.assetRevision || 0
      } : {}),
      fit: current.fit || BACKGROUND_IMAGE_FITS.COVER,
      position: current.position || BACKGROUND_IMAGE_POSITIONS.CENTER,
      repeat: current.repeat === true
    }
  }
  return { ...shared, type: BACKGROUND_TYPES.NONE }
}

export function ThemeBackgroundFields({
  draft,
  disabled,
  imageFile,
  onBackgroundChange,
  onImageFileChange
}) {
  const background = draft.background

  function update(patch) {
    onBackgroundChange({ ...background, ...patch })
  }

  function updateType(type) {
    if (type !== BACKGROUND_TYPES.IMAGE) onImageFileChange(null)
    onBackgroundChange(backgroundForType(type, draft))
  }

  return (
    <div className="settings-theme-form-grid">
      <label className="mdp-ui-field">
        <span className="mdp-ui-field__label">Background type</span>
        <select
          className="mdp-ui-select"
          value={background.type}
          disabled={disabled}
          onChange={(event) => updateType(event.target.value)}
        >
          <option value={BACKGROUND_TYPES.NONE}>Theme color only</option>
          <option value={BACKGROUND_TYPES.SOLID}>Solid scene</option>
          <option value={BACKGROUND_TYPES.GRADIENT}>Gradient</option>
          <option value={BACKGROUND_TYPES.IMAGE}>Local image or animation</option>
        </select>
      </label>

      {background.type === BACKGROUND_TYPES.SOLID ? (
        <label className="mdp-ui-field">
          <span className="mdp-ui-field__label">Scene color</span>
          <input
            type="color"
            className="settings-theme-wide-color"
            value={colorPickerValue(background.color, draft.colors.background)}
            disabled={disabled}
            onChange={(event) => update({ color: event.target.value })}
          />
        </label>
      ) : null}

      {background.type === BACKGROUND_TYPES.GRADIENT ? (
        <>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Start color</span>
            <input
              type="color"
              className="settings-theme-wide-color"
              value={colorPickerValue(background.startColor, draft.colors.background)}
              disabled={disabled}
              onChange={(event) => update({ startColor: event.target.value })}
            />
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">End color</span>
            <input
              type="color"
              className="settings-theme-wide-color"
              value={colorPickerValue(background.endColor, draft.colors.accent)}
              disabled={disabled}
              onChange={(event) => update({ endColor: event.target.value })}
            />
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Angle (0–360°)</span>
            <input
              type="number"
              className="mdp-ui-input mdp-ui-input--technical"
              min="0"
              max="360"
              value={background.angle}
              disabled={disabled}
              onChange={(event) => update({ angle: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {background.type === BACKGROUND_TYPES.IMAGE ? (
        <>
          <label className="mdp-ui-field settings-theme-image-field">
            <span className="mdp-ui-field__label">Image file</span>
            <input
              className="mdp-ui-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/apng"
              disabled={disabled}
              onChange={(event) => onImageFileChange(event.target.files?.[0] || null)}
            />
            <span className="mdp-ui-field__helper">
              {imageFile?.name || (background.assetId ? 'Stored on this device' : 'PNG, JPEG, WebP, AVIF, GIF, or APNG; up to 5 MiB.')}
            </span>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Image fit</span>
            <select
              className="mdp-ui-select"
              value={background.fit}
              disabled={disabled}
              onChange={(event) => update({ fit: event.target.value })}
            >
              {Object.values(BACKGROUND_IMAGE_FITS).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Image position</span>
            <select
              className="mdp-ui-select"
              value={background.position}
              disabled={disabled}
              onChange={(event) => update({ position: event.target.value })}
            >
              {Object.values(BACKGROUND_IMAGE_POSITIONS).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="settings-theme-switch-field">
            <div>
              <strong>Repeat image</strong>
              <span>Tile the image instead of showing one canvas.</span>
            </div>
            <Switch
              id="settings-theme-image-repeat"
              label="Repeat image"
              checked={background.repeat === true}
              disabled={disabled}
              onChange={(event) => update({ repeat: event.target.checked })}
            />
          </div>
        </>
      ) : null}

      {background.type !== BACKGROUND_TYPES.NONE ? (
        <>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Motion</span>
            <select
              className="mdp-ui-select"
              value={background.motion}
              disabled={disabled}
              onChange={(event) => update({ motion: event.target.value })}
            >
              <option value={BACKGROUND_MOTION.SYSTEM}>Follow system</option>
              <option value={BACKGROUND_MOTION.ON}>Animate</option>
              <option value={BACKGROUND_MOTION.OFF}>Still</option>
            </select>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">Dimming (0–0.8)</span>
            <input
              className="mdp-ui-input mdp-ui-input--technical"
              type="number"
              min="0"
              max="0.8"
              step="0.05"
              value={background.overlayOpacity}
              disabled={disabled}
              onChange={(event) => update({ overlayOpacity: event.target.value })}
            />
          </label>
        </>
      ) : null}
    </div>
  )
}
