import { FILE_TYPE_COLORS } from './file-type-colors.js'

/** Native 16px identities: one clear symbol per format, without miniature badges or control handles. */
export const FILE_TYPE_ICONS = {
  folder: {
    label: 'Folder', color: '#D6A34A',
    elements: [
      ['path', { d: 'M1.5 5V3.5a1 1 0 0 1 1-1H6l1.5 2H13a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5Z', fill: 'currentColor', 'fill-opacity': '.22' }],
      ['path', { d: 'M1.5 6h13' }]
    ]
  },
  'folder-open': {
    label: 'Open folder', color: '#D6A34A',
    elements: [
      ['path', { d: 'M1.5 7V3.5a1 1 0 0 1 1-1H6l1.5 2H13a1.5 1.5 0 0 1 1.5 1.5v1' }],
      ['path', { d: 'M1.5 7h13l-2 7H3.5Z', fill: 'currentColor', 'fill-opacity': '.28' }]
    ]
  },
  markdown: {
    label: 'Markdown', color: FILE_TYPE_COLORS.markdown.light, colorToken: '--mdp-file-icon-markdown',
    elements: [
      ['path', { d: 'M9.5 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.5Z', fill: 'currentColor', 'fill-opacity': '.1' }],
      ['path', { d: 'M9.5 1.5v4h4' }],
      ['path', { d: 'M5 11.5v-4l3 3 3-3v4' }]
    ]
  },
  text: {
    label: 'Text file', color: FILE_TYPE_COLORS.text.light, colorToken: '--mdp-file-icon-text',
    elements: [
      ['path', { d: 'M9.5 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.5Z', fill: 'currentColor', 'fill-opacity': '.08' }],
      ['path', { d: 'M9.5 1.5v4h4 M5 8.5h6 M5 11.5h4' }]
    ]
  },
  database: {
    label: 'SQL file', color: FILE_TYPE_COLORS.database.light, colorToken: '--mdp-file-icon-database',
    elements: [
      ['path', { d: 'M2.5 4v8c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V4', fill: 'currentColor', 'fill-opacity': '.1' }],
      ['ellipse', { cx: '8', cy: '4', rx: '5.5', ry: '2.5', fill: 'currentColor', 'fill-opacity': '.18' }],
      ['path', { d: 'M2.5 8c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5' }]
    ]
  },
  schema: {
    label: 'DBML schema', color: FILE_TYPE_COLORS.schema.light, colorToken: '--mdp-file-icon-schema',
    elements: [
      ['rect', { x: '2', y: '2.5', width: '12', height: '11', rx: '1.5', fill: 'currentColor', 'fill-opacity': '.1' }],
      ['path', { d: 'M2 6h12 M2 9.5h12 M6.5 6v7.5' }]
    ]
  },
  diagram: {
    label: 'Mermaid diagram', color: FILE_TYPE_COLORS.diagram.light, colorToken: '--mdp-file-icon-diagram',
    elements: [
      ['path', { d: 'M7 4h5v5' }],
      ['rect', { x: '1.5', y: '1.5', width: '5.5', height: '5', rx: '1', fill: 'currentColor', 'fill-opacity': '.1' }],
      ['rect', { x: '9', y: '9', width: '5.5', height: '5.5', rx: '1', fill: 'currentColor', 'fill-opacity': '.1' }]
    ]
  },
  image: {
    label: 'Image file', color: FILE_TYPE_COLORS.image.light, colorToken: '--mdp-file-icon-image',
    elements: [
      ['rect', { x: '1.5', y: '1.5', width: '13', height: '13', rx: '2', fill: 'currentColor', 'fill-opacity': '.08' }],
      ['circle', { cx: '10.5', cy: '5', r: '1.3', fill: 'currentColor', stroke: 'none' }],
      ['path', { d: 'm2 12 4.5-4.5 7.5 6', fill: 'currentColor', 'fill-opacity': '.1' }]
    ]
  },
  vector: {
    label: 'SVG file', color: FILE_TYPE_COLORS.vector.light, colorToken: '--mdp-file-icon-vector',
    elements: [
      ['path', { d: 'm2 14 2-9 6-3 4 4-3 6Z', fill: 'currentColor', 'fill-opacity': '.1' }],
      ['path', { d: 'm2 14 5-5' }],
      ['circle', { cx: '8', cy: '8', r: '1.5' }]
    ]
  }
}
