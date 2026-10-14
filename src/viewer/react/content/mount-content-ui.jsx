import React from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { logger } from '../../../shared/logger.js'

const runtimes = new WeakMap()
let nextEntryId = 0

class ContentUiBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) {
    logger.warn('Content UI failed.', { errorName: error?.name || 'Error' })
  }
  render() {
    return this.state.failed ? <span role="alert">This control could not be displayed.</span> : this.props.children
  }
}

function getViewerRoot(node) {
  return node?.closest?.('#mdp-viewer-root') || node?.ownerDocument?.body || node
}

export function getContentOverlayTarget(node) {
  return node?.closest?.('.mdp-root') || getViewerRoot(node)
}

function getRuntime(node) {
  const viewerRoot = getViewerRoot(node)
  let runtime = runtimes.get(viewerRoot)
  if (!runtime) {
    const host = viewerRoot.ownerDocument.createElement('div')
    host.className = 'mdp-content-ui-host'
    viewerRoot.append(host)
    runtime = { host, root: createRoot(host), entries: new Map(), destroyed: false, batchDepth: 0 }
    runtimes.set(viewerRoot, runtime)
  }
  return runtime
}

function commit(runtime) {
  if (runtime.destroyed || runtime.batchDepth) return
  // This is an imperative renderer/event boundary, never a React effect. Flush
  // before reading refs or letting a renderer replace a portal's parent DOM.
  flushSync(() => runtime.root.render(
    <>{[...runtime.entries.values()].map(({ id, target, node }) =>
      createPortal(<ContentUiBoundary>{node}</ContentUiBoundary>, target, id)
    )}</>
  ))
}

/** One shared React root per viewer; each target is an exclusively owned UI slot. */
export function mountContentUi(target, Component, props, { scope = target } = {}) {
  const runtime = getRuntime(target)
  const entry = { id: String(++nextEntryId), target, scope, node: <Component {...props} /> }
  runtime.entries.set(entry.id, entry)
  commit(runtime)
  let active = true
  return {
    update(nextProps) {
      if (!active || runtime.destroyed || !runtime.entries.has(entry.id)) return
      entry.node = <Component {...nextProps} />
      commit(runtime)
    },
    destroy() {
      if (!active) return
      active = false
      runtime.entries.delete(entry.id)
      commit(runtime)
    }
  }
}

/** Install many independent controls in one commit, without remounting siblings. */
export function batchContentUi(scope, callback) {
  const viewerRoot = getViewerRoot(scope)
  const runtime = runtimes.get(viewerRoot) || (viewerRoot?.isConnected ? getRuntime(scope) : null)
  if (!runtime) return callback()
  runtime.batchDepth++
  try { return callback() } finally { runtime.batchDepth--; commit(runtime) }
}

/** Unmount controls, effects and overlays BEFORE their document DOM is removed. */
export function clearContentUi(scope) {
  const runtime = runtimes.get(getViewerRoot(scope))
  if (!runtime) return
  for (const [id, entry] of runtime.entries) {
    if (entry.scope === scope || scope.contains?.(entry.scope) || scope.contains?.(entry.target)) runtime.entries.delete(id)
  }
  commit(runtime)
}

export function destroyContentUi(node) {
  const viewerRoot = getViewerRoot(node)
  const runtime = runtimes.get(viewerRoot)
  if (!runtime) return
  runtime.entries.clear()
  flushSync(() => runtime.root.unmount())
  runtime.destroyed = true
  runtime.host.remove()
  runtimes.delete(viewerRoot)
}
