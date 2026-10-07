/** Compatibility helpers for code blocks, diagrams, and image lightboxes. */
import { createAppIconSvg } from '../shared/icons/create-app-icon.js'
export { SVG_NS } from '../shared/icons/create-app-icon.js'

export const createCopyIconSvg = (options = {}) => createAppIconSvg('copy', { width: 14, height: 14, ...options })
export const createExpandIconSvg = (options = {}) => createAppIconSvg('expand', { width: 14, height: 14, ...options })
export const createZoomInIconSvg = (options = {}) => createAppIconSvg('zoom-in', { width: 16, height: 16, ...options })
export const createZoomOutIconSvg = (options = {}) => createAppIconSvg('zoom-out', { width: 16, height: 16, ...options })
export const createRecenterIconSvg = (options = {}) => createAppIconSvg('recenter', { width: 16, height: 16, ...options })
export const createCloseIconSvg = (options = {}) => createAppIconSvg('close', { width: 16, height: 16, ...options })
