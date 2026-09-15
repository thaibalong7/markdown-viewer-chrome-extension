import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { loadCodemirror } from '../../editor/codemirror-bundle.js'
import { createEditorTheme } from '../../editor/editor-theme.js'
import { getScrollFraction } from '../../editor/scroll-sync.js'
import { countWords } from '../../editor/editor-stats.js'
import { normalizeEditorSettings } from '../../../shared/constants/editor.js'

/**
 * @param {object} props
 * @param {string} props.markdown
 * @param {(markdown: string) => void} [props.onContentChange]
 * @param {(api: { scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }) => void} [props.onEditorReady]
 * @param {() => void} [props.onEditorDestroy]
 * @param {(payload: { topLine0Float: number, scrollFraction: number }) => void} [props.onEditorScroll]
 * @param {() => void} [props.onSave]
 * @param {(payload: { line: number, col: number, wordCount: number }) => void} [props.onStatusChange]
 * @param {{ fontSize?: number, tabSize?: number, wordWrap?: boolean, lineNumbers?: boolean }} [props.editorSettings]
 */
export const EditorPanel = forwardRef(function EditorPanel({ markdown, onContentChange, onEditorReady, onEditorDestroy, onEditorScroll, onSave, onStatusChange, editorSettings }, ref) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const cmRef = useRef(null)
  const configCompartmentsRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const onStatusChangeRef = useRef(onStatusChange)
  const onContentChangeRef = useRef(onContentChange)
  const onEditorScrollRef = useRef(onEditorScroll)
  const onEditorReadyRef = useRef(onEditorReady)
  const onEditorDestroyRef = useRef(onEditorDestroy)
  const onSaveRef = useRef(onSave)
  const editorSettingsRef = useRef(normalizeEditorSettings(editorSettings))
  const suppressContentChangeRef = useRef(false)
  const scrollHandlerRef = useRef(null)

  useEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])
  useEffect(() => {
    onEditorScrollRef.current = onEditorScroll
  }, [onEditorScroll])
  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])
  useEffect(() => {
    onEditorDestroyRef.current = onEditorDestroy
  }, [onEditorDestroy])
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])
  useEffect(() => {
    editorSettingsRef.current = normalizeEditorSettings(editorSettings)
  }, [editorSettings])

  const handleContainerRef = useCallback((node) => {
    containerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref && typeof ref === 'object') ref.current = node
  }, [ref])

  const reportStatus = useCallback((line, col, words) => {
    onStatusChangeRef.current?.({ line, col, wordCount: words })
  }, [])

  const reportScroll = useCallback((view) => {
    if (!view) return
    const fn = onEditorScrollRef.current
    if (typeof fn !== 'function') return
    const state = view.state
    const scroller = view.scrollDOM
    const scrollRect = scroller.getBoundingClientRect()
    const contentRect = view.contentDOM.getBoundingClientRect()
    // Prefer coordinate mapping at viewport top; fallback to block height mapping.
    let startPos = view.viewport ? view.viewport.from : 0
    const x = contentRect.left + 4
    const y = scrollRect.top + 2
    const at = view.posAtCoords({ x, y }) ?? view.posAtCoords({ x, y }, false)
    if (at != null && Number.isFinite(at)) {
      startPos = at
    } else {
      const topPx = Math.max(0, scroller.scrollTop)
      const block = typeof view.lineBlockAtHeight === 'function' ? view.lineBlockAtHeight(topPx) : null
      if (block && Number.isFinite(block.from)) {
        const blockTop = Number.isFinite(block.top) ? block.top : topPx
        const blockHeight = Math.max(1, Number(block.height) || 1)
        const blockLen = Math.max(1, Number(block.length) || 1)
        const within = Math.max(0, Math.min(0.999, (topPx - blockTop) / blockHeight))
        startPos = Math.min(state.doc.length, Math.max(0, block.from + Math.floor(blockLen * within)))
      }
    }
    const safeFrom = Math.min(Math.max(0, startPos), state.doc.length)
    const line = state.doc.lineAt(safeFrom)
    const scrollFraction = getScrollFraction(scroller)
    const rel = safeFrom - line.from
    const lineLen = Math.max(1, line.length)
    const topLine0Float = line.number - 1 + rel / lineLen
    fn({ topLine0Float, scrollFraction })
  }, [])

  const initEditor = useCallback(
    async (node, content) => {
      if (!node) return
      const cm = await loadCodemirror()
      if (!node.isConnected) return

      cmRef.current = cm
      const shadowRoot = node.getRootNode()
      const normalizedSettings = normalizeEditorSettings(editorSettingsRef.current)
      const compartments = {
        lineNumbers: new cm.Compartment(),
        wordWrap: new cm.Compartment(),
        tabSize: new cm.Compartment(),
        theme: new cm.Compartment()
      }
      configCompartmentsRef.current = compartments

      const onScroll = () => {
        reportScroll(viewRef.current)
      }
      scrollHandlerRef.current = onScroll
      const openReplacePanel = (view) => {
        cm.openSearchPanel(view)
        requestAnimationFrame(() => {
          const replaceField = view.dom.querySelector('.cm-search input[name="replace"]')
          if (replaceField instanceof HTMLInputElement) {
            replaceField.focus()
            replaceField.select()
          }
        })
        return true
      }

      const extensions = [
        cm.updateListener.of((update) => {
          if (update.docChanged) {
            if (!suppressContentChangeRef.current) {
              const docStr = update.state.doc.toString()
              onContentChangeRef.current?.(docStr)
              const words = countWords(docStr)
              const sel = update.state.selection.main
              const lineInfo = update.state.doc.lineAt(sel.head)
              reportStatus(lineInfo.number, sel.head - lineInfo.from + 1, words)
            }
          }
          if (update.selectionSet && !update.docChanged) {
            const sel = update.state.selection.main
            const lineInfo = update.state.doc.lineAt(sel.head)
            reportStatus(lineInfo.number, sel.head - lineInfo.from + 1, countWords(update.state.doc.toString()))
          }
          if (update.docChanged || update.viewportChanged) {
            reportScroll(update.view)
          }
        }),
        compartments.lineNumbers.of(
          normalizedSettings.lineNumbers
            ? [cm.lineNumbers(), cm.highlightActiveLineGutter()]
            : []
        ),
        cm.highlightActiveLine(),
        cm.drawSelection(),
        cm.dropCursor(),
        cm.rectangularSelection(),
        cm.crosshairCursor(),
        cm.history(),
        cm.search({ top: true }),
        cm.highlightSelectionMatches(),
        cm.indentOnInput(),
        cm.bracketMatching(),
        cm.syntaxHighlighting(cm.defaultHighlightStyle, { fallback: true }),
        cm.markdown(),
        cm.keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              onSaveRef.current?.()
              return true
            }
          },
          {
            key: 'Mod-h',
            run: openReplacePanel,
            preventDefault: true
          },
          ...cm.defaultKeymap,
          ...cm.searchKeymap,
          ...cm.historyKeymap,
          ...cm.foldKeymap,
          cm.indentWithTab
        ]),
        compartments.wordWrap.of(
          normalizedSettings.wordWrap ? cm.EditorView.lineWrapping : []
        ),
        compartments.tabSize.of(cm.EditorState.tabSize.of(normalizedSettings.tabSize)),
        compartments.theme.of(createEditorTheme(cm.EditorView, normalizedSettings))
      ]

      const state = cm.EditorState.create({
        doc: content || '',
        extensions
      })

      const view = new cm.EditorView({
        state,
        parent: node,
        root: shadowRoot instanceof ShadowRoot ? shadowRoot : undefined
      })

      viewRef.current = view
      view.scrollDOM.addEventListener('scroll', onScroll, { passive: true })
      setLoading(false)

      const sel = view.state.selection.main
      const lineInfo = view.state.doc.lineAt(sel.head)
      reportStatus(lineInfo.number, sel.head - lineInfo.from + 1, countWords(view.state.doc.toString()))

      const api = {
        /** @type {HTMLElement} */
        scrollDOM: view.scrollDOM,
        /** @param {number} line1Based */
        scrollToLine(line1Based) {
          const v = viewRef.current
          if (!v) return
          const lines = v.state.doc.lines
          const n = Math.max(1, Math.min(Math.floor(Number(line1Based) || 1), lines))
          const line = v.state.doc.line(n)
          v.dispatch({
            selection: { anchor: line.from, head: line.from },
            effects: [cm.EditorView.scrollIntoView(line.from, { y: 'start' })]
          })
        }
      }
      onEditorReadyRef.current?.(api)
      requestAnimationFrame(() => reportScroll(view))
    },
    [reportScroll, reportStatus]
  )

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    void initEditor(node, markdown)
    return () => {
      const v = viewRef.current
      const h = scrollHandlerRef.current
      if (v && h) {
        v.scrollDOM.removeEventListener('scroll', h)
      }
      scrollHandlerRef.current = null
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      cmRef.current = null
      configCompartmentsRef.current = null
      onEditorDestroyRef.current?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = viewRef.current
    const cm = cmRef.current
    const compartments = configCompartmentsRef.current
    if (!v || !cm || !compartments || loading) return

    const normalizedSettings = normalizeEditorSettings(editorSettings)
    v.dispatch({
      effects: [
        compartments.lineNumbers.reconfigure(
          normalizedSettings.lineNumbers
            ? [cm.lineNumbers(), cm.highlightActiveLineGutter()]
            : []
        ),
        compartments.wordWrap.reconfigure(
          normalizedSettings.wordWrap ? cm.EditorView.lineWrapping : []
        ),
        compartments.tabSize.reconfigure(cm.EditorState.tabSize.of(normalizedSettings.tabSize)),
        compartments.theme.reconfigure(createEditorTheme(cm.EditorView, normalizedSettings))
      ]
    })
    requestAnimationFrame(() => reportScroll(v))
  }, [
    editorSettings?.fontSize,
    editorSettings?.tabSize,
    editorSettings?.wordWrap,
    editorSettings?.lineNumbers,
    loading,
    reportScroll
  ])

  useEffect(() => {
    const v = viewRef.current
    if (!v || loading) return
    if (markdown === v.state.doc.toString()) return
    suppressContentChangeRef.current = true
    v.dispatch({
      changes: { from: 0, to: v.state.doc.length, insert: String(markdown || '') }
    })
    suppressContentChangeRef.current = false
    requestAnimationFrame(() => reportScroll(v))
  }, [markdown, loading, reportScroll])

  return (
    <div
      className="mdp-editor-panel"
      ref={handleContainerRef}
    >
      {loading && (
        <div style={{ padding: '16px', color: 'var(--mdp-muted)', fontSize: '14px' }}>
          Loading editor…
        </div>
      )}
    </div>
  )
})
