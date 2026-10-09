import { describe, expect, it } from 'vitest'
import {
  buildExplorerFilesContext,
  injectCurrentDocumentAtRootIfMissing
} from '../explorer-files-context.js'

describe('explorer files context labels', () => {
  it('keeps sibling-mode labels concise for the Files panel', () => {
    const context = buildExplorerFilesContext({
      explorerMode: 'sibling',
      currentFileUrl: 'file:///docs/product/README.md'
    })

    expect(context.currentLine).toBe('README.md')
    expect(context.statusLine).toBe('This file’s folder')
  })

  it('uses a short progress label while scanning a workspace', () => {
    const context = buildExplorerFilesContext({
      explorerMode: 'workspace',
      currentFileUrl: 'file:///docs/product/README.md',
      scanPhase: 'scanning'
    })

    expect(context.currentLine).toBe('README.md')
    expect(context.statusLine).toBe('Scanning workspace…')
  })
})

describe('explorer current-document recovery', () => {
  it('keeps folders above a file injected after a limited scan', () => {
    const tree = {
      type: 'folder',
      name: 'docs',
      href: 'file:///docs/',
      depth: 0,
      children: [
        { type: 'file', name: 'Zulu.md', href: 'file:///docs/Zulu.md', depth: 1 },
        { type: 'folder', name: 'assets', href: 'file:///docs/assets/', depth: 1, children: [] }
      ]
    }

    const result = injectCurrentDocumentAtRootIfMissing(
      tree,
      'file:///docs/alpha.md',
      { hitFileLimit: true, hitFolderLimit: false, skippedByDepth: 0 },
      'file:///docs/'
    )

    expect(result).toEqual({ injected: true })
    expect(tree.children.map((node) => `${node.type}:${node.name}`)).toEqual([
      'folder:assets',
      'file:alpha.md',
      'file:Zulu.md'
    ])
  })
})
