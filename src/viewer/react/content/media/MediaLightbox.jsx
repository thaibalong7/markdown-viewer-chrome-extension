import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

/** The empty media canvas is a renderer-owned island; React owns its surroundings. */
export function MediaLightbox({ kind, open, dragging, rasterized, refs, onZoomOut, onZoomIn, onFit, onClose }) {
  useLocale()
  const base = `mdp-${kind}-lightbox`
  const image = kind === 'image'
  const controls = [
    { ref: refs.zoomOutButton, icon: 'zoom-out', label: image ? 'viewer.media.zoomOutImage' : 'viewer.media.zoomOutMermaidChart', action: onZoomOut },
    { ref: refs.zoomInButton, icon: 'zoom-in', label: image ? 'viewer.media.zoomInImage' : 'viewer.media.zoomInMermaidChart', action: onZoomIn },
    { ref: refs.recenterButton, icon: 'recenter', label: image ? 'viewer.media.fitImageToView' : 'viewer.media.reCenterMermaidChart', action: onFit },
    { ref: refs.closeButton, icon: 'close', label: image ? 'viewer.media.closeImageZoomView' : 'viewer.media.closeMermaidChart', action: onClose }
  ]
  const hints = image
    ? 'viewer.media.dragToPanCtrlScrollPinchToZoom'
    : 'viewer.media.dragAnywhereToPanCtrlScrollPinchTo'

  return (
    <div
      ref={refs.overlay}
      className={`${base}${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
      hidden={!open}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={image ? t('viewer.media.imageZoomView') : t('viewer.media.mermaidChartZoomView')}
      aria-hidden={!open}
    >
      <div ref={refs.viewport} className={`${base}__viewport`}>
        <div className={`${base}__positioner`}>
          <div ref={refs.canvas} className={`${base}__canvas${rasterized ? ' mdp-lightbox-rasterized' : ''}`} />
        </div>
      </div>
      <div className={`${base}__controls`}>
        <div ref={refs.resolutionHost} style={{ display: 'contents' }} />
        <div className="mdp-lightbox-zoom-buttons">
          {controls.map(control => (
            <button
              ref={control.ref}
              key={control.icon}
              type="button"
              className={`${base}__button${!image && control.icon === 'close' ? ` ${base}__button--close` : ''}`}
              aria-label={t(control.label)}
              onClick={control.action}
            >
              <AppIcon name={control.icon} size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className={`${base}__hints`}>{t(hints)}</div>
    </div>
  )
}
