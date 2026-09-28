import React, { useEffect, useMemo, useState } from 'react'
import { logger } from '../../shared/logger.js'
import {
  isAnimatedImageBlob,
  parseThemeBackgroundDataUrl
} from '../../shared/background-image.js'
import {
  BUILT_IN_THEMES,
  EDITABLE_THEME_COLOR_FIELDS,
  createStyleVars,
  getSyntaxThemeDefinition,
  resolveActiveTheme
} from '../../theme/index.js'
import { getThemeAsset } from '../../theme/theme-asset-client.js'
import {
  BACKGROUND_MOTION,
  BACKGROUND_TYPES,
  resolveBackgroundScene
} from '../../theme/backgrounds.js'

const VALID_HEX_COLOR = /^#[0-9a-f]{6}$/i
const PREVIEW_THEME_ID = 'custom:preview-theme'
const PREVIEW_CODE = "const theme = 'Markdown Plus'\npreview(theme)"

function createPreviewSettings(settings, theme) {
  const baseColors = BUILT_IN_THEMES[theme.baseId] || BUILT_IN_THEMES.light
  const colors = Object.fromEntries(
    EDITABLE_THEME_COLOR_FIELDS.map(({ key }) => [
      key,
      VALID_HEX_COLOR.test(String(theme.colors?.[key] || ''))
        ? theme.colors[key]
        : baseColors[key]
    ])
  )
  const previewTheme = {
    id: PREVIEW_THEME_ID,
    name: theme.name,
    baseId: theme.baseId,
    syntaxThemeId: theme.syntaxThemeId ?? null,
    colors,
    background: { ...theme.background }
  }

  return {
    ...settings,
    theme: {
      activeId: PREVIEW_THEME_ID,
      customThemes: [previewTheme]
    }
  }
}

function usePreviewImage(scene, imageFile) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (scene.kind !== 'image') {
      setImage(null)
      return undefined
    }

    let active = true
    let objectUrl = null
    setImage(null)

    if (imageFile) {
      objectUrl = URL.createObjectURL?.(imageFile) || null
      void isAnimatedImageBlob(imageFile)
        .then((animated) => {
          if (active && objectUrl) setImage({ url: objectUrl, animated })
        })
        .catch((error) => {
          if (!active) return
          setImage(objectUrl ? { url: objectUrl, animated: false } : null)
          logger.warn('Could not inspect the theme preview image.', error)
        })
    } else if (scene.assetId) {
      void getThemeAsset(scene.assetId)
        .then((asset) => {
          if (active && asset?.dataUrl) {
            const blob = parseThemeBackgroundDataUrl(asset.dataUrl)
            objectUrl = URL.createObjectURL?.(blob) || asset.dataUrl
            setImage({ url: objectUrl, animated: asset.animated === true })
          }
        })
        .catch((error) => {
          if (!active) return
          setImage(null)
          logger.warn('Could not load the theme preview image.', error)
        })
    }

    return () => {
      active = false
      if (objectUrl?.startsWith?.('blob:')) URL.revokeObjectURL?.(objectUrl)
    }
  }, [imageFile, scene.assetId, scene.assetRevision, scene.kind])

  return image
}

function useSyntaxPreview(syntaxThemeId) {
  const [highlighted, setHighlighted] = useState(null)

  useEffect(() => {
    let active = true
    setHighlighted(null)

    void import('../../viewer/core/shiki-theme-preview.js')
      .then(({ highlightSyntaxThemePreview }) =>
        highlightSyntaxThemePreview(PREVIEW_CODE, syntaxThemeId)
      )
      .then((result) => {
        if (active) setHighlighted(result)
      })
      .catch((error) => {
        if (!active) return
        setHighlighted(null)
        logger.warn('Could not render the syntax theme preview.', error)
      })

    return () => {
      active = false
    }
  }, [syntaxThemeId])

  return highlighted
}

function getSyntaxTokenStyle(token) {
  const fontStyle = Number(token.fontStyle) || 0
  return {
    color: token.color || undefined,
    fontStyle: fontStyle & 1 ? 'italic' : undefined,
    fontWeight: fontStyle & 2 ? 700 : undefined,
    textDecoration: fontStyle & 4 ? 'underline' : undefined
  }
}

function SyntaxPreview({ highlighted }) {
  if (!highlighted?.tokens?.length) {
    return (
      <pre><code>{PREVIEW_CODE}</code></pre>
    )
  }

  return (
    <pre style={{ backgroundColor: highlighted.bg, color: highlighted.fg }}>
      <code>
        {highlighted.tokens.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line.map((token, tokenIndex) => (
              <span key={`${lineIndex}-${tokenIndex}`} style={getSyntaxTokenStyle(token)}>
                {token.content}
              </span>
            ))}
            {lineIndex < highlighted.tokens.length - 1 ? '\n' : null}
          </React.Fragment>
        ))}
      </code>
    </pre>
  )
}

function getSceneStyle(scene, imageUrl) {
  if (scene.kind === BACKGROUND_TYPES.SOLID) {
    return { backgroundColor: scene.color }
  }
  if (scene.kind === BACKGROUND_TYPES.GRADIENT) {
    return {
      backgroundColor: scene.color,
      backgroundImage: scene.image,
      backgroundPosition: scene.position,
      backgroundSize: scene.size
    }
  }
  if (scene.kind === BACKGROUND_TYPES.IMAGE && imageUrl) {
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundPosition: scene.position,
      backgroundRepeat: scene.repeat ? 'repeat' : 'no-repeat',
      backgroundSize: scene.fit === 'auto' ? 'auto' : scene.fit
    }
  }
  return undefined
}

export function ThemePreview({ settings, theme, imageFile = null }) {
  const previewSettings = useMemo(
    () => createPreviewSettings(settings, theme),
    [settings, theme]
  )
  const resolvedTheme = useMemo(
    () => resolveActiveTheme(previewSettings),
    [previewSettings]
  )
  const styleVars = useMemo(() => createStyleVars(previewSettings), [previewSettings])
  const scene = useMemo(
    () => resolveBackgroundScene(
      imageFile && resolvedTheme.background?.type === BACKGROUND_TYPES.IMAGE
        ? { ...resolvedTheme.background, assetId: 'theme-asset:preview' }
        : resolvedTheme.background
    ),
    [imageFile, resolvedTheme.background]
  )
  const image = usePreviewImage(scene, imageFile)
  const syntaxPreview = useSyntaxPreview(resolvedTheme.syntaxThemeId)
  const syntaxTheme = getSyntaxThemeDefinition(resolvedTheme.syntaxThemeId)
  const allowImage = !(image?.animated && scene.motion === BACKGROUND_MOTION.OFF)
  const sceneClassName = [
    'settings-theme-preview__scene',
    scene.animated && scene.motion !== BACKGROUND_MOTION.OFF
      ? 'settings-theme-preview__scene--motion'
      : ''
  ].filter(Boolean).join(' ')
  const viewportClassName = [
    'settings-theme-preview__viewport',
    scene.visual ? 'settings-theme-preview__viewport--visual' : ''
  ].filter(Boolean).join(' ')

  return (
    <aside className="settings-theme-preview" style={styleVars} aria-label="Live theme preview">
      <div className="settings-theme-preview__header">
        <div>
          <span className="settings-theme-preview__eyebrow">
            <span className="settings-theme-preview__live-dot" aria-hidden="true" />
            Live preview
          </span>
          <strong>{theme.name?.trim() || 'Untitled theme'}</strong>
        </div>
        <div className="settings-theme-preview__badges">
          <span className="settings-theme-preview__base">Base: {resolvedTheme.baseId}</span>
          <span className="settings-theme-preview__base">
            Code: {syntaxTheme?.name || resolvedTheme.syntaxThemeId}
          </span>
        </div>
      </div>
      <p className="settings-theme-preview__hint">Every valid change appears here instantly. Saving is not required.</p>

      <div className="settings-theme-preview__device">
        <div className="settings-theme-preview__device-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <div>guide.md</div>
        </div>
        <div className={viewportClassName}>
          {scene.visual ? (
            <div className={sceneClassName} style={getSceneStyle(scene, allowImage ? image?.url : null)}>
              <div
                className="settings-theme-preview__overlay"
                style={{ backgroundColor: `rgb(3 7 18 / ${scene.overlayOpacity})` }}
              />
            </div>
          ) : null}

          <div className="settings-theme-preview__viewer" aria-hidden="true">
            <div className="settings-theme-preview__files">
              <div className="settings-theme-preview__panel-title">
                <span>Files</span>
                <span className="settings-theme-preview__panel-action">+</span>
              </div>
              <div className="settings-theme-preview__workspace">MY NOTES</div>
              <div className="settings-theme-preview__tree-row">
                <span>⌄</span>
                <strong>docs</strong>
              </div>
              <div className="settings-theme-preview__tree-row settings-theme-preview__tree-row--active">
                <span>◆</span>
                <strong>guide.md</strong>
              </div>
              <div className="settings-theme-preview__tree-row settings-theme-preview__tree-row--nested">
                <span>◇</span>
                <strong>notes.md</strong>
              </div>
              <div className="settings-theme-preview__tree-row">
                <span>◇</span>
                <strong>README.md</strong>
              </div>
            </div>

            <div className="settings-theme-preview__content">
              <article className="settings-theme-preview__article">
                <span className="settings-theme-preview__kicker">MARKDOWN PLUS</span>
                <h2>Design notes that feel like home.</h2>
                <p>
                  A calm reading space for ideas, snippets, and <span className="settings-theme-preview__link">useful links</span>.
                </p>
                <blockquote>“The smallest details make the biggest difference.”</blockquote>
                <div className="settings-theme-preview__code">
                  <div className="settings-theme-preview__code-meta">
                    <span>JavaScript</span>
                    <span className="settings-theme-preview__code-copy">
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <rect x="4" y="4" width="11" height="11" rx="2" />
                      </svg>
                    </span>
                  </div>
                  <SyntaxPreview highlighted={syntaxPreview} />
                </div>
                <div className="settings-theme-preview__table">
                  <div><strong>Token</strong><strong>Role</strong></div>
                  <div><span>Accent</span><span>Focus</span></div>
                  <div><span>Surface</span><span>Reading</span></div>
                </div>
              </article>
            </div>

            <div className="settings-theme-preview__outline">
              <div className="settings-theme-preview__panel-title">
                <span>Outline</span>
                <span className="settings-theme-preview__panel-action">•••</span>
              </div>
              <div className="settings-theme-preview__outline-item settings-theme-preview__outline-item--active">Overview</div>
              <div className="settings-theme-preview__outline-item">Details</div>
              <div className="settings-theme-preview__outline-item">Examples</div>
              <div className="settings-theme-preview__outline-rule" />
              <span className="settings-theme-preview__status-pill">Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-theme-preview__legend" aria-hidden="true">
        <span><i className="settings-theme-preview__swatch settings-theme-preview__swatch--surface" />Surface</span>
        <span><i className="settings-theme-preview__swatch settings-theme-preview__swatch--text" />Text</span>
        <span><i className="settings-theme-preview__swatch settings-theme-preview__swatch--link" />Link</span>
        <span><i className="settings-theme-preview__swatch settings-theme-preview__swatch--accent" />Accent</span>
      </div>
    </aside>
  )
}
