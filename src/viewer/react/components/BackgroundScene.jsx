import React, { useEffect, useState } from 'react'
import { logger } from '../../../shared/logger.js'
import { parseThemeBackgroundDataUrl } from '../../../shared/background-image.js'
import { resolveActiveTheme } from '../../../theme/index.js'
import { getThemeAsset } from '../../../theme/theme-asset-client.js'
import {
  BACKGROUND_MOTION,
  resolveBackgroundScene
} from '../../../theme/backgrounds.js'

function usePageVisibility() {
  const [visible, setVisible] = useState(() => globalThis.document?.visibilityState !== 'hidden')
  useEffect(() => {
    if (!globalThis.document) return undefined
    const handleVisibilityChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  return visible
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  ))
  useEffect(() => {
    const media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return undefined
    const handleChange = () => setReduced(media.matches)
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [])
  return reduced
}

export function resolveBackgroundSceneForSettings(settings = {}) {
  return resolveBackgroundScene(resolveActiveTheme(settings).background)
}

export function BackgroundScene({ scene }) {
  const [themeImage, setThemeImage] = useState(null)
  const pageVisible = usePageVisibility()
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (scene.kind !== 'image' || !scene.assetId) {
      setThemeImage(null)
      return undefined
    }

    let active = true
    let objectUrl = null
    setThemeImage(null)
    void getThemeAsset(scene.assetId)
      .then((asset) => {
        if (!active || !asset?.dataUrl) return
        const blob = parseThemeBackgroundDataUrl(asset.dataUrl)
        objectUrl = typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(blob)
          : asset.dataUrl
        if (active) {
          setThemeImage({
            url: objectUrl,
            intrinsicallyAnimated: asset.animated === true
          })
        }
      })
      .catch((error) => {
        if (!active) return
        setThemeImage(null)
        logger.warn('Could not load the active theme background.', error)
      })

    return () => {
      active = false
      if (objectUrl?.startsWith?.('blob:')) URL.revokeObjectURL?.(objectUrl)
    }
  }, [scene.kind, scene.assetId, scene.assetRevision])

  if (!scene.visual) return null

  const motionEnabled = scene.animated && scene.motion !== BACKGROUND_MOTION.OFF
  const allowIntrinsicMotion = scene.motion !== BACKGROUND_MOTION.OFF && !prefersReducedMotion
  const classNames = ['mdp-background-scene']
  if (motionEnabled) classNames.push('mdp-background-scene--motion')
  if (!pageVisible) classNames.push('is-paused')

  const visualStyle = scene.kind === 'gradient'
    ? {
        backgroundColor: scene.color,
        backgroundImage: scene.image,
        backgroundPosition: scene.position,
        backgroundSize: scene.size
      }
    : scene.kind === 'solid'
      ? { backgroundColor: scene.color }
      : undefined
  const themeImageUrl = themeImage?.intrinsicallyAnimated && !allowIntrinsicMotion
    ? null
    : themeImage?.url

  const imageStyle = scene.kind === 'image'
    ? {
        objectFit: scene.fit,
        objectPosition: scene.position
      }
    : undefined
  const repeatedImageStyle = scene.kind === 'image' && scene.repeat && themeImageUrl
    ? {
        backgroundImage: `url("${themeImageUrl}")`,
        backgroundPosition: scene.position,
        backgroundRepeat: 'repeat',
        backgroundSize: scene.fit === 'auto' ? 'auto' : scene.fit
      }
    : undefined

  return (
    <div className={classNames.join(' ')} aria-hidden="true">
      {repeatedImageStyle ? (
        <div className="mdp-background-scene__visual" style={repeatedImageStyle} />
      ) : themeImageUrl ? (
        <img
          className="mdp-background-scene__image"
          src={themeImageUrl}
          alt=""
          style={imageStyle}
        />
      ) : (
        <div className="mdp-background-scene__visual" style={visualStyle} />
      )}
      <div
        className="mdp-background-scene__overlay"
        style={{ backgroundColor: `rgb(3 7 18 / ${scene.overlayOpacity})` }}
      />
    </div>
  )
}
