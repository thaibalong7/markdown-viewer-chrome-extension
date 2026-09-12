import { describe, expect, it } from 'vitest'
import { buildExplorerFilesContext } from '../explorer-files-context.js'

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
