import { describe, expect, it } from 'vitest'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'
import { createDocumentIdentity, documentDisplayNameFromUrl } from '../document-model.js'

describe('document model', () => {
  it('creates serializable identity for real and virtual documents', () => {
    expect(createDocumentIdentity('file:///D%E1%BB%B1%20%C3%A1n/Guide%20Notes.mdc')).toMatchObject({
      displayName: 'Guide Notes.mdc',
      fileTypeId: 'markdown',
      sourceKind: 'file-url',
      viewMode: 'rendered'
    })

    const virtualHref = `${MDP_WS_FILE}${encodeURIComponent('Dự án/docs/Hướng dẫn.md')}`
    expect(createDocumentIdentity(virtualHref)).toMatchObject({
      displayName: 'Hướng dẫn.md',
      sourceKind: 'workspace-file'
    })
  })

  it('creates plain-text identities and rejects unsupported identities', () => {
    expect(createDocumentIdentity('file:///docs/notes.txt')).toMatchObject({
      displayName: 'notes.txt',
      fileTypeId: 'text',
      sourceKind: 'file-url'
    })
    expect(createDocumentIdentity('file:///docs/schema.sql')).toMatchObject({
      displayName: 'schema.sql',
      fileTypeId: 'sql',
      sourceKind: 'file-url'
    })
    expect(createDocumentIdentity('file:///docs/notes.json')).toBeNull()
    expect(documentDisplayNameFromUrl('')).toBe('')
  })
})
