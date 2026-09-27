export const BACKGROUND_TYPES = Object.freeze({
  NONE: 'none',
  SOLID: 'solid',
  GRADIENT: 'gradient',
  IMAGE: 'image'
})

export const BACKGROUND_MOTION = Object.freeze({
  SYSTEM: 'system',
  ON: 'on',
  OFF: 'off'
})

export const BACKGROUND_IMAGE_FITS = Object.freeze({
  COVER: 'cover',
  CONTAIN: 'contain',
  AUTO: 'auto'
})

export const BACKGROUND_IMAGE_POSITIONS = Object.freeze({
  CENTER: 'center',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
})

export const DEFAULT_THEME_BACKGROUND = Object.freeze({
  type: BACKGROUND_TYPES.NONE,
  motion: BACKGROUND_MOTION.SYSTEM,
  overlayOpacity: 0.08
})

export const AURORA_THEME_BACKGROUND = Object.freeze({
  type: BACKGROUND_TYPES.GRADIENT,
  variant: 'aurora',
  motion: BACKGROUND_MOTION.SYSTEM,
  overlayOpacity: 0.08
})

const AURORA_SCENE = Object.freeze({
  kind: 'gradient',
  color: '#0b1020',
  image: [
    'radial-gradient(circle at 14% 8%, rgb(139 92 246 / 62%), transparent 38%)',
    'radial-gradient(circle at 84% 16%, rgb(34 211 238 / 48%), transparent 42%)',
    'radial-gradient(circle at 52% 92%, rgb(16 185 129 / 34%), transparent 46%)',
    'linear-gradient(135deg, #0b1020 0%, #111936 52%, #071923 100%)'
  ].join(', '),
  position: 'center',
  size: '112% 112%',
  animated: true
})

function clampOverlayOpacity(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_THEME_BACKGROUND.overlayOpacity
  return Math.max(0, Math.min(0.8, number))
}

function resolveMotion(background) {
  return Object.values(BACKGROUND_MOTION).includes(background?.motion)
    ? background.motion
    : BACKGROUND_MOTION.SYSTEM
}

/**
 * Resolve a validated theme-owned background descriptor into render-only scene data.
 * This boundary constructs trusted CSS values and never accepts arbitrary CSS or remote URLs.
 * @param {object} background
 */
export function resolveBackgroundScene(background = DEFAULT_THEME_BACKGROUND) {
  const motion = resolveMotion(background)
  const overlayOpacity = clampOverlayOpacity(background?.overlayOpacity)

  if (background?.type === BACKGROUND_TYPES.SOLID) {
    return {
      kind: 'solid',
      visual: true,
      color: background.color,
      motion,
      overlayOpacity,
      animated: false
    }
  }

  if (background?.type === BACKGROUND_TYPES.GRADIENT) {
    if (background.variant === 'aurora') {
      return { ...AURORA_SCENE, visual: true, motion, overlayOpacity }
    }
    const angle = Number.isFinite(Number(background.angle))
      ? Math.max(0, Math.min(360, Number(background.angle)))
      : 135
    return {
      kind: 'gradient',
      visual: true,
      color: background.startColor,
      image: `linear-gradient(${angle}deg, ${background.startColor}, ${background.endColor})`,
      position: 'center',
      size: '112% 112%',
      animated: true,
      motion,
      overlayOpacity
    }
  }

  if (background?.type === BACKGROUND_TYPES.IMAGE && background.assetId) {
    return {
      kind: 'image',
      visual: true,
      assetId: background.assetId,
      assetRevision: Number(background.assetRevision) || 0,
      fit: Object.values(BACKGROUND_IMAGE_FITS).includes(background.fit)
        ? background.fit
        : BACKGROUND_IMAGE_FITS.COVER,
      position: Object.values(BACKGROUND_IMAGE_POSITIONS).includes(background.position)
        ? background.position
        : BACKGROUND_IMAGE_POSITIONS.CENTER,
      repeat: background.repeat === true,
      animated: true,
      motion,
      overlayOpacity
    }
  }

  return {
    kind: 'none',
    visual: false,
    motion,
    overlayOpacity
  }
}
