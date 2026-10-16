import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { Switch } from '../../shared/react/Switch.jsx'
import {
  BACKGROUND_IMAGE_FITS,
  BACKGROUND_IMAGE_POSITIONS,
  BACKGROUND_MOTION,
  BACKGROUND_TYPES,
  DEFAULT_THEME_BACKGROUND
} from '../../theme/backgrounds.js'

const IMAGE_LABELS = { cover: 'options.themes.background.fillCanvas', contain: 'options.themes.background.fitWithinCanvas', auto: 'options.themes.background.originalSize', center: 'options.themes.background.center', top: 'options.themes.background.top', bottom: 'options.themes.background.bottom', left: 'options.themes.background.left', right: 'options.themes.background.right' }

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
  useLocale()
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
        <span className="mdp-ui-field__label">{t('options.themes.background.backgroundType')}</span>
        <select
          className="mdp-ui-select"
          value={background.type}
          disabled={disabled}
          onChange={(event) => updateType(event.target.value)}
        >
          <option value={BACKGROUND_TYPES.NONE}>{t('options.themes.background.themeColorOnly')}</option>
          <option value={BACKGROUND_TYPES.SOLID}>{t('options.themes.background.solidScene')}</option>
          <option value={BACKGROUND_TYPES.GRADIENT}>{t('options.themes.background.gradient')}</option>
          <option value={BACKGROUND_TYPES.IMAGE}>{t('options.themes.background.localImageOrAnimation')}</option>
        </select>
      </label>

      {background.type === BACKGROUND_TYPES.SOLID ? <label className="mdp-ui-field">
          <span className="mdp-ui-field__label">{t('options.themes.background.sceneColor')}</span>
          <input
            type="color"
            className="settings-theme-wide-color"
            value={colorPickerValue(background.color, draft.colors.background)}
            disabled={disabled}
            onChange={(event) => update({ color: event.target.value })}
          />
        </label> : null}

      {background.type === BACKGROUND_TYPES.GRADIENT ? <>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.startColor')}</span>
            <input
              type="color"
              className="settings-theme-wide-color"
              value={colorPickerValue(background.startColor, draft.colors.background)}
              disabled={disabled}
              onChange={(event) => update({ startColor: event.target.value })}
            />
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.endColor')}</span>
            <input
              type="color"
              className="settings-theme-wide-color"
              value={colorPickerValue(background.endColor, draft.colors.accent)}
              disabled={disabled}
              onChange={(event) => update({ endColor: event.target.value })}
            />
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.angle0360')}</span>
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
        </> : null}

      {background.type === BACKGROUND_TYPES.IMAGE ? <>
          <label className="mdp-ui-field settings-theme-image-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.imageFile')}</span>
            <input
              className="mdp-ui-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/apng"
              disabled={disabled}
              onChange={(event) => onImageFileChange(event.target.files?.[0] || null)}
            />
            <span className="mdp-ui-field__helper">
              {imageFile?.name || t(background.assetId ? 'options.themes.background.storedOnThisDevice' : 'options.themes.background.pngJPEGWebPAVIFGIFOrAPNGUp')}
            </span>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.imageFit')}</span>
            <select
              className="mdp-ui-select"
              value={background.fit}
              disabled={disabled}
              onChange={(event) => update({ fit: event.target.value })}
            >
              {Object.values(BACKGROUND_IMAGE_FITS).map((value) => (
                <option key={value} value={value}>{t(IMAGE_LABELS[value])}</option>
              ))}
            </select>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.imagePosition')}</span>
            <select
              className="mdp-ui-select"
              value={background.position}
              disabled={disabled}
              onChange={(event) => update({ position: event.target.value })}
            >
              {Object.values(BACKGROUND_IMAGE_POSITIONS).map((value) => (
                <option key={value} value={value}>{t(IMAGE_LABELS[value])}</option>
              ))}
            </select>
          </label>
          <div className="settings-theme-switch-field">
            <div>
              <strong>{t('options.themes.background.repeatImage')}</strong>
              <span>{t('options.themes.background.tileTheImageInsteadOfShowingOneCanvas')}</span>
            </div>
            <Switch
              id="settings-theme-image-repeat"
              label={t('options.themes.background.repeatImage')}
              checked={background.repeat === true}
              disabled={disabled}
              onChange={(event) => update({ repeat: event.target.checked })}
            />
          </div>
        </> : null}

      {background.type !== BACKGROUND_TYPES.NONE ? <>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.motion')}</span>
            <select
              className="mdp-ui-select"
              value={background.motion}
              disabled={disabled}
              onChange={(event) => update({ motion: event.target.value })}
            >
              <option value={BACKGROUND_MOTION.SYSTEM}>{t('options.themes.background.followSystem')}</option>
              <option value={BACKGROUND_MOTION.ON}>{t('options.themes.background.animate')}</option>
              <option value={BACKGROUND_MOTION.OFF}>{t('options.themes.background.still')}</option>
            </select>
          </label>
          <label className="mdp-ui-field">
            <span className="mdp-ui-field__label">{t('options.themes.background.dimming008')}</span>
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
        </> : null}
    </div>
  )
}
