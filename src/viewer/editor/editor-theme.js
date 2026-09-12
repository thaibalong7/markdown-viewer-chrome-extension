import {
  EDITOR_GUTTER_MIN_WIDTH_PX,
  EDITOR_LINE_HEIGHT,
  normalizeEditorSettings
} from '../../shared/constants/editor.js'

export function createEditorTheme(EditorView, editorSettings = {}) {
  const settings = normalizeEditorSettings(editorSettings)
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--mdp-surface)',
      color: 'var(--mdp-text)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: `${settings.fontSize}px`,
      height: '100%'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit'
    },
    '.cm-content': {
      caretColor: 'var(--mdp-text)',
      padding: '18px 0',
      lineHeight: String(EDITOR_LINE_HEIGHT)
    },
    '.cm-gutters': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-panel-bg) 78%, var(--mdp-surface))',
      color: 'var(--mdp-muted)',
      borderRight: '1px solid var(--mdp-border)',
      minWidth: `${EDITOR_GUTTER_MIN_WIDTH_PX}px`
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--mdp-link-soft)',
      color: 'var(--mdp-link)'
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link-soft) 48%, transparent)'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--mdp-text)'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link) 22%, transparent)'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link) 14%, transparent)'
    },
    '.cm-panels': {
      backgroundColor: 'var(--mdp-surface)',
      color: 'var(--mdp-text)',
      borderColor: 'var(--mdp-border)'
    },
    '.cm-panels-top': {
      borderBottom: '1px solid var(--mdp-border)'
    },
    '.cm-panel.cm-search': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px',
      margin: '10px',
      padding: '8px 42px 8px 8px',
      border: '1px solid var(--mdp-border)',
      borderRadius: '10px',
      backgroundColor: 'var(--mdp-surface)',
      color: 'var(--mdp-text)'
    },
    '.cm-panel.cm-search br': {
      display: 'none'
    },
    '.cm-panel.cm-search .cm-textfield': {
      minWidth: '120px',
      height: '30px',
      padding: '4px 8px',
      border: '1px solid var(--mdp-border)',
      borderRadius: '6px',
      backgroundColor: 'var(--mdp-bg)',
      color: 'var(--mdp-text)',
      font: 'inherit'
    },
    '.cm-panel.cm-search .cm-textfield:focus': {
      borderColor: 'var(--mdp-link)',
      outline: '2px solid color-mix(in srgb, var(--mdp-link) 26%, transparent)',
      outlineOffset: '1px'
    },
    '.cm-panel.cm-search .cm-button': {
      height: '30px',
      padding: '4px 9px',
      border: '1px solid var(--mdp-border)',
      borderRadius: '6px',
      backgroundColor: 'var(--mdp-surface)',
      color: 'var(--mdp-text)',
      font: 'inherit',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      borderColor: 'var(--mdp-link)',
      color: 'var(--mdp-link)',
      backgroundColor: 'var(--mdp-link-soft)'
    },
    '.cm-panel.cm-search label': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      height: '30px',
      margin: '0 6px 0 0',
      color: 'var(--mdp-muted)',
      lineHeight: '1',
      whiteSpace: 'nowrap'
    },
    '.cm-panel.cm-search input[type="checkbox"]': {
      width: '13px',
      height: '13px',
      margin: '0',
      accentColor: 'var(--mdp-link)'
    },
    '.cm-panel.cm-search button[name="close"]': {
      top: '50%',
      right: '8px',
      width: '30px',
      height: '30px',
      padding: '0',
      border: '1px solid transparent',
      borderRadius: '6px',
      transform: 'translateY(-50%)',
      color: 'var(--mdp-muted)',
      fontSize: '16px',
      lineHeight: '26px',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search button[name="close"]:hover': {
      borderColor: 'var(--mdp-border)',
      color: 'var(--mdp-text)',
      backgroundColor: 'var(--mdp-link-soft)'
    },
    '.cm-searchMatch': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link) 22%, transparent)'
    },
    '.cm-searchMatch-selected': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link) 38%, transparent)'
    },
    '.cm-matchingBracket': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-link) 18%, transparent)',
      outline: '1px solid color-mix(in srgb, var(--mdp-link) 40%, transparent)'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--mdp-code-bg)',
      border: '1px solid var(--mdp-border)',
      color: 'var(--mdp-muted)'
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--mdp-surface)',
      border: '1px solid var(--mdp-border)',
      color: 'var(--mdp-text)',
      borderRadius: '8px',
      boxShadow: 'var(--mdp-shadow-float)'
    },
    '&.cm-focused': {
      outline: 'none'
    }
  })
}
