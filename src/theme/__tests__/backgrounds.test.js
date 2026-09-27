import { describe, expect, it } from 'vitest'
import {
  AURORA_THEME_BACKGROUND,
  BACKGROUND_MOTION,
  resolveBackgroundScene
} from '../backgrounds.js'

describe('theme-owned background scene resolution', () => {
  it('resolves the built-in Aurora descriptor', () => {
    expect(resolveBackgroundScene(AURORA_THEME_BACKGROUND)).toMatchObject({
      kind: 'gradient',
      visual: true,
      animated: true
    })
  })

  it('keeps themes without a visual background plain', () => {
    expect(resolveBackgroundScene({ type: 'none' })).toEqual({
      kind: 'none',
      visual: false,
      motion: BACKGROUND_MOTION.SYSTEM,
      overlayOpacity: 0.08
    })
  })

  it('resolves structured gradients and local image asset references', () => {
    expect(resolveBackgroundScene({
      type: 'gradient',
      angle: 45,
      startColor: '#112233',
      endColor: '#445566',
      motion: 'off'
    })).toMatchObject({
      kind: 'gradient',
      image: 'linear-gradient(45deg, #112233, #445566)',
      motion: 'off'
    })
    expect(resolveBackgroundScene({
      type: 'image',
      assetId: 'theme-asset:12345678',
      assetRevision: 9,
      motion: 'off'
    })).toMatchObject({
      kind: 'image',
      visual: true,
      assetId: 'theme-asset:12345678',
      assetRevision: 9,
      motion: 'off'
    })
  })
})
