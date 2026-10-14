import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

/** The empty media canvas is a renderer-owned island; React owns its surroundings. */
export function MediaLightbox({ kind, open, dragging, rasterized, refs, onZoomOut, onZoomIn, onFit, onClose }) {
  const base = `mdp-${kind}-lightbox`
  const image = kind === 'image'
  const controls = [
    { ref: refs.zoomOutButton, icon: 'zoom-out', label: image ? 'Zoom out image' : 'Zoom out Mermaid chart', action: onZoomOut },
    { ref: refs.zoomInButton, icon: 'zoom-in', label: image ? 'Zoom in image' : 'Zoom in Mermaid chart', action: onZoomIn },
    { ref: refs.recenterButton, icon: 'recenter', label: image ? 'Fit image to view' : 'Re-center Mermaid chart', action: onFit },
    { ref: refs.closeButton, icon: 'close', label: image ? 'Close image zoom view' : 'Close Mermaid chart', action: onClose }
  ]
  const hints = image
    ? 'Drag to pan  |  Ctrl + Scroll / pinch to zoom  |  +/- to zoom  |  0 to fit  |  Esc to close'
    : 'Drag anywhere to pan  |  Ctrl + Scroll / pinch to zoom  |  Two-finger scroll to pan  |  +/- to zoom  |  0 to re-center  |  Esc to close'

  return (
    <div
      ref={refs.overlay}
      className={`${base}${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
      hidden={!open}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={image ? 'Image zoom view' : 'Mermaid chart zoom view'}
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
              aria-label={control.label}
              onClick={control.action}
            >
              <AppIcon name={control.icon} size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className={`${base}__hints`}>{hints}</div>
    </div>
  )
}
