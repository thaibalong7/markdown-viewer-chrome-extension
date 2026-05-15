let cmPromise = null

export function loadCodemirror() {
  if (!cmPromise) {
    cmPromise = (async () => {
      const [
        cmState,
        cmView,
        cmMarkdown,
        cmLanguage,
        cmCommands,
        cmSearch,
        lezerHighlight
      ] = await Promise.all([
        import('@codemirror/state'),
        import('@codemirror/view'),
        import('@codemirror/lang-markdown'),
        import('@codemirror/language'),
        import('@codemirror/commands'),
        import('@codemirror/search'),
        import('@lezer/highlight')
      ])

      return {
        EditorState: cmState.EditorState,
        Compartment: cmState.Compartment,
        EditorView: cmView.EditorView,
        /** Facet for view update callbacks (e.g. doc/scroll). On `loadCodemirror()`. */
        updateListener: cmView.EditorView.updateListener,
        keymap: cmView.keymap,
        lineNumbers: cmView.lineNumbers,
        highlightActiveLine: cmView.highlightActiveLine,
        highlightActiveLineGutter: cmView.highlightActiveLineGutter,
        drawSelection: cmView.drawSelection,
        rectangularSelection: cmView.rectangularSelection,
        crosshairCursor: cmView.crosshairCursor,
        dropCursor: cmView.dropCursor,
        markdown: cmMarkdown.markdown,
        markdownLanguage: cmMarkdown.markdownLanguage,
        defaultHighlightStyle: cmLanguage.defaultHighlightStyle,
        syntaxHighlighting: cmLanguage.syntaxHighlighting,
        indentOnInput: cmLanguage.indentOnInput,
        bracketMatching: cmLanguage.bracketMatching,
        foldGutter: cmLanguage.foldGutter,
        foldKeymap: cmLanguage.foldKeymap,
        defaultKeymap: cmCommands.defaultKeymap,
        history: cmCommands.history,
        historyKeymap: cmCommands.historyKeymap,
        indentWithTab: cmCommands.indentWithTab,
        search: cmSearch.search,
        searchKeymap: cmSearch.searchKeymap,
        openSearchPanel: cmSearch.openSearchPanel,
        highlightSelectionMatches: cmSearch.highlightSelectionMatches,
        tags: lezerHighlight.tags
      }
    })()
  }
  return cmPromise
}
