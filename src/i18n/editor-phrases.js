import { t } from './index.js'

// CodeMirror owns these English phrase IDs; map them explicitly to our catalog IDs.
const PHRASES = Object.freeze({
  "Find": 'viewer.editor.search.find',
  "Replace": 'viewer.editor.search.replaceFieldLabel',
  "next": 'viewer.editor.search.next',
  "previous": 'viewer.editor.search.previous',
  "all": 'viewer.editor.search.all',
  "match case": 'viewer.editor.search.matchCase',
  "regexp": 'viewer.editor.search.regexp',
  "by word": 'viewer.editor.search.wholeWord',
  "replace": 'viewer.editor.search.replaceAction',
  "replace all": 'viewer.editor.search.replaceAll',
  "close": 'viewer.editor.search.close',
  "Go to line": 'viewer.editor.search.goToLine',
  "go": 'viewer.editor.search.go',
  "current match": 'viewer.editor.search.currentMatch',
  "on line": 'viewer.editor.search.onLine',
  "replaced match on line $": 'viewer.editor.search.replacedMatchOnLine',
  "replaced $ matches": 'viewer.editor.search.replacedMatches',
  "Selection deleted": 'viewer.editor.accessibility.selectionDeleted',
  "Folded lines": 'viewer.editor.accessibility.foldedLines',
  "Unfolded lines": 'viewer.editor.accessibility.unfoldedLines',
  "to": 'viewer.editor.search.to',
  "folded code": 'viewer.editor.accessibility.foldedCode',
  "unfold": 'viewer.editor.accessibility.unfold',
  "Fold line": 'viewer.editor.accessibility.foldLine',
  "Unfold line": 'viewer.editor.accessibility.unfoldLine',
  "Control character": 'viewer.editor.accessibility.controlCharacter'
})

export function getEditorPhrases(locale) {
  return Object.fromEntries(Object.entries(PHRASES).map(([phrase, key]) => [phrase, t(key, {}, locale)]))
}
