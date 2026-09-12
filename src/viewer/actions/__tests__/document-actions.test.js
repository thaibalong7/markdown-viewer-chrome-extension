import { describe, expect, it } from 'vitest'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'
import { buildExportFilename } from '../document-actions.js'

describe('document action filenames', () => {
  it('uses the basename of a real .mdc document for export', () => {
    expect(buildExportFilename('file:///docs/Project%20Rules.mdc', 'html')).toBe(
      'Project Rules.html'
    )
  })

  it('uses the basename of a virtual .mdc document for export', () => {
    const href = `${MDP_WS_FILE}${encodeURIComponent('Workspace/docs/Project Rules.mdc')}`
    expect(buildExportFilename(href, 'doc')).toBe('Project Rules.doc')
  })
})
