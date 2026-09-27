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
      columnGap: '6px',
      rowGap: '8px',
      margin: '10px',
      padding: '10px 46px 10px 10px',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '12px',
      background: 'color-mix(in srgb, var(--mdp-panel-bg) 88%, var(--mdp-surface))',
      boxShadow: 'var(--mdp-shadow-raised)',
      color: 'var(--mdp-text)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '12px'
    },
    '.cm-panel.cm-search br': {
      display: 'block',
      flex: '0 0 100%',
      width: '100%',
      height: '0'
    },
    '.cm-panel.cm-search > :is(input, button, label)': {
      margin: '0'
    },
    '.cm-panel.cm-search .cm-textfield': {
      flex: '0 1 280px',
      width: 'min(280px, 100%)',
      minWidth: '160px',
      height: '32px',
      padding: '5px 10px',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '8px',
      background: 'var(--mdp-surface)',
      color: 'var(--mdp-text)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '20px',
      boxShadow: 'inset 0 1px 2px color-mix(in srgb, var(--mdp-text) 6%, transparent)',
      transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease'
    },
    '.cm-panel.cm-search .cm-textfield:hover': {
      borderColor: 'color-mix(in srgb, var(--mdp-link) 36%, var(--mdp-border-strong))'
    },
    '.cm-panel.cm-search .cm-textfield::placeholder': {
      color: 'var(--mdp-muted)',
      opacity: '0.82'
    },
    '.cm-panel.cm-search .cm-textfield:focus-visible': {
      borderColor: 'var(--mdp-link)',
      outline: 'none',
      boxShadow: '0 0 0 3px color-mix(in srgb, var(--mdp-link) 24%, transparent)'
    },
    '.cm-panel.cm-search .cm-button': {
      appearance: 'none',
      height: '32px',
      padding: '5px 10px',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '8px',
      background: 'var(--mdp-surface)',
      backgroundImage: 'none',
      color: 'var(--mdp-text)',
      font: 'inherit',
      fontSize: '12px',
      fontWeight: '650',
      lineHeight: '20px',
      boxShadow: 'var(--mdp-shadow-subtle)',
      cursor: 'pointer',
      transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      borderColor: 'color-mix(in srgb, var(--mdp-link) 48%, var(--mdp-border-strong))',
      color: 'var(--mdp-link)',
      backgroundColor: 'var(--mdp-link-soft)'
    },
    '.cm-panel.cm-search .cm-button:active': {
      backgroundImage: 'none',
      transform: 'translateY(1px)'
    },
    '.cm-panel.cm-search .cm-button:focus-visible': {
      outline: '2px solid var(--mdp-focus-color)',
      outlineOffset: '2px'
    },
    '.cm-panel.cm-search label': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      height: '32px',
      padding: '0 8px',
      border: '1px solid transparent',
      borderRadius: '8px',
      background: 'color-mix(in srgb, var(--mdp-surface) 52%, transparent)',
      color: 'var(--mdp-muted)',
      fontSize: '11px',
      fontWeight: '600',
      lineHeight: '20px',
      cursor: 'pointer',
      transition: 'background-color 150ms ease, color 150ms ease',
      whiteSpace: 'nowrap'
    },
    '.cm-panel.cm-search label:hover': {
      backgroundColor: 'var(--mdp-surface)',
      color: 'var(--mdp-text)'
    },
    '.cm-panel.cm-search input[type="checkbox"]': {
      appearance: 'none',
      width: '14px',
      height: '14px',
      margin: '0',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '4px',
      backgroundColor: 'var(--mdp-surface)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '10px 10px',
      cursor: 'pointer',
      transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease'
    },
    '.cm-panel.cm-search input[type="checkbox"]:checked': {
      borderColor: 'var(--mdp-link)',
      backgroundColor: 'var(--mdp-link)',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M2.2 6.1 4.8 8.7 9.8 3.4\' fill=\'none\' stroke=\'white\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
    },
    '.cm-panel.cm-search input[type="checkbox"]:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 3px color-mix(in srgb, var(--mdp-link) 24%, transparent)'
    },
    '.cm-panel.cm-search button[name="close"]': {
      appearance: 'none',
      top: '10px',
      right: '10px',
      width: '32px',
      height: '32px',
      padding: '0',
      border: '1px solid transparent',
      borderRadius: '8px',
      background: 'transparent',
      color: 'var(--mdp-muted)',
      fontSize: '18px',
      lineHeight: '30px',
      cursor: 'pointer',
      transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease'
    },
    '.cm-panel.cm-search button[name="close"]:hover': {
      borderColor: 'var(--mdp-border-strong)',
      color: 'var(--mdp-text)',
      backgroundColor: 'var(--mdp-panel-strong)'
    },
    '.cm-panel.cm-search button[name="close"]:focus-visible': {
      outline: '2px solid var(--mdp-focus-color)',
      outlineOffset: '2px'
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
