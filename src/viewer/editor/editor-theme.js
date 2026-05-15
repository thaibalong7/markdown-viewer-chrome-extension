import {
  EDITOR_GUTTER_MIN_WIDTH_PX,
  EDITOR_LINE_HEIGHT,
  normalizeEditorSettings
} from '../../shared/constants/editor.js'

export function createEditorTheme(EditorView, editorSettings = {}) {
  const settings = normalizeEditorSettings(editorSettings)
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--mdp-bg)',
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
      padding: '12px 0',
      lineHeight: String(EDITOR_LINE_HEIGHT)
    },
    '.cm-gutters': {
      backgroundColor: 'var(--mdp-panel-bg)',
      color: 'var(--mdp-muted)',
      borderRight: '1px solid var(--mdp-border)',
      minWidth: `${EDITOR_GUTTER_MIN_WIDTH_PX}px`
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--mdp-text)'
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--mdp-border) 20%, transparent)'
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
      backgroundColor: 'var(--mdp-panel-bg)',
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
      gap: '4px',
      padding: '6px 40px 6px 8px',
      backgroundColor: 'var(--mdp-panel-bg)',
      color: 'var(--mdp-text)'
    },
    '.cm-panel.cm-search br': {
      display: 'none'
    },
    '.cm-panel.cm-search .cm-textfield': {
      minWidth: '120px',
      height: '24px',
      padding: '2px 7px',
      border: '1px solid var(--mdp-border)',
      borderRadius: '4px',
      backgroundColor: 'var(--mdp-bg)',
      color: 'var(--mdp-text)',
      font: 'inherit'
    },
    '.cm-panel.cm-search .cm-textfield:focus': {
      borderColor: 'var(--mdp-link)',
      outline: '1px solid color-mix(in srgb, var(--mdp-link) 35%, transparent)'
    },
    '.cm-panel.cm-search .cm-button': {
      height: '24px',
      padding: '2px 8px',
      border: '1px solid var(--mdp-border)',
      borderRadius: '4px',
      backgroundColor: 'var(--mdp-bg)',
      color: 'var(--mdp-text)',
      font: 'inherit',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      borderColor: 'var(--mdp-link)',
      color: 'var(--mdp-link)'
    },
    '.cm-panel.cm-search label': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      height: '24px',
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
      width: '24px',
      height: '24px',
      padding: '0',
      border: '1px solid transparent',
      borderRadius: '4px',
      transform: 'translateY(-50%)',
      color: 'var(--mdp-muted)',
      fontSize: '16px',
      lineHeight: '20px',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search button[name="close"]:hover': {
      borderColor: 'var(--mdp-border)',
      color: 'var(--mdp-text)',
      backgroundColor: 'var(--mdp-bg)'
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
      backgroundColor: 'var(--mdp-panel-bg)',
      border: '1px solid var(--mdp-border)',
      color: 'var(--mdp-text)'
    },
    '&.cm-focused': {
      outline: 'none'
    }
  })
}
