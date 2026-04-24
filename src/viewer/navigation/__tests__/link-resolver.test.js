import { describe, it, expect } from 'vitest'
import { resolveMarkdownLink } from '../link-resolver.js'

const BASE_FILE = 'file:///Users/me/docs/a.md'

function resolve(href, overrides = {}) {
  return resolveMarkdownLink(href, { currentFileUrl: BASE_FILE, ...overrides })
}

describe('resolveMarkdownLink', () => {
  describe('empty / falsy / unsafe href', () => {
    it.each([undefined, null, '', '   '])('returns unsupported for %j', (href) => {
      const r = resolve(href)
      expect(r.kind).toBe('unsupported')
      expect(r.shouldIntercept).toBe(false)
    })

    it.each(['javascript:alert(1)', 'data:text/html,hi', 'blob:http://x/abc'])(
      'returns unsupported for unsafe %s',
      (href) => {
        const r = resolve(href)
        expect(r.kind).toBe('unsupported')
        expect(r.shouldIntercept).toBe(false)
      }
    )
  })

  describe('same-document hash', () => {
    it('recognizes #section', () => {
      const r = resolve('#section')
      expect(r.kind).toBe('same-document-hash')
      expect(r.hash).toBe('section')
      expect(r.shouldIntercept).toBe(true)
    })

    it('decodes encoded hash', () => {
      const r = resolve('#c%C3%A0i-%C4%91%E1%BA%B7t')
      expect(r.kind).toBe('same-document-hash')
      expect(r.hash).toBe('cài-đặt')
      expect(r.shouldIntercept).toBe(true)
    })

    it('handles bare # as unsupported (empty hash)', () => {
      const r = resolve('#')
      expect(r.kind).toBe('same-document-hash')
      expect(r.hash).toBeNull()
    })
  })

  describe('external links', () => {
    it.each([
      'https://example.com',
      'http://localhost:3000',
      'mailto:abc@example.com',
      'tel:+1234567890',
      'HTTPS://example.com'
    ])('returns external for %s', (href) => {
      const r = resolve(href)
      expect(r.kind).toBe('external')
      expect(r.shouldIntercept).toBe(false)
    })
  })

  describe('relative markdown file (same folder)', () => {
    it('resolves b.md', () => {
      const r = resolve('b.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/docs/b.md')
      expect(r.hash).toBeNull()
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves ./b.md', () => {
      const r = resolve('./b.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/docs/b.md')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves b.markdown', () => {
      const r = resolve('b.markdown')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves b.mdown', () => {
      const r = resolve('b.mdown')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves b.md#usage with hash', () => {
      const r = resolve('b.md#usage')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/docs/b.md')
      expect(r.hash).toBe('usage')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('relative markdown file (subfolder / parent)', () => {
    it('resolves guides/install.md', () => {
      const r = resolve('guides/install.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/docs/guides/install.md')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves ./guides/install.md#step-2', () => {
      const r = resolve('./guides/install.md#step-2')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/docs/guides/install.md')
      expect(r.hash).toBe('step-2')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves ../README.md', () => {
      const r = resolve('../README.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/me/README.md')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves ../../shared/spec.md', () => {
      const r = resolve('../../shared/spec.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///Users/shared/spec.md')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('self-link detection', () => {
    it('detects a.md as self-link', () => {
      const r = resolve('a.md')
      expect(r.kind).toBe('self-link')
      expect(r.shouldIntercept).toBe(true)
      expect(r.hash).toBeNull()
    })

    it('detects ./a.md as self-link', () => {
      const r = resolve('./a.md')
      expect(r.kind).toBe('self-link')
      expect(r.shouldIntercept).toBe(true)
    })

    it('detects a.md#next as self-link with hash', () => {
      const r = resolve('a.md#next')
      expect(r.kind).toBe('self-link')
      expect(r.hash).toBe('next')
      expect(r.shouldIntercept).toBe(true)
    })

    it('detects absolute self URL as self-link', () => {
      const r = resolve('file:///Users/me/docs/a.md')
      expect(r.kind).toBe('self-link')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('file names with spaces', () => {
    it('resolves My Notes.md', () => {
      const r = resolve('My%20Notes.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves URL-encoded My%20Notes.md', () => {
      const r = resolve('My%20Notes.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
      expect(r.resolvedUrl).toContain('My%20Notes.md')
    })
  })

  describe('file names with Unicode', () => {
    it('resolves ghi%20chu.md', () => {
      const r = resolve('ghi%20chu.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('absolute file: links', () => {
    it('resolves file:///other/path/doc.md', () => {
      const r = resolve('file:///other/path/doc.md')
      expect(r.kind).toBe('markdown-file')
      expect(r.resolvedUrl).toBe('file:///other/path/doc.md')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves file:///other/doc.md#heading', () => {
      const r = resolve('file:///other/doc.md#heading')
      expect(r.kind).toBe('markdown-file')
      expect(r.hash).toBe('heading')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('non-markdown local assets', () => {
    it.each(['image.png', 'diagram.svg', 'report.pdf', 'data.json', 'archive.zip'])(
      'returns asset for %s',
      (href) => {
        const r = resolve(href)
        expect(r.kind).toBe('asset')
        expect(r.shouldIntercept).toBe(false)
      }
    )
  })

  describe('URL with query string', () => {
    it('checks extension on pathname not query', () => {
      const r = resolve('b.md?raw=1')
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })
  })

  describe('workspace virtual links', () => {
    const MDP_WS_FILE = 'mdp-ws-file:'
    const virtualBase = `${MDP_WS_FILE}docs%2Fa.md`

    it('returns workspace-virtual-file when virtualFileExists is true', () => {
      const target = `${MDP_WS_FILE}docs%2Fb.md`
      const r = resolveMarkdownLink(target, {
        currentFileUrl: virtualBase,
        virtualFileExists: (href) => href === target
      })
      expect(r.kind).toBe('workspace-virtual-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('returns unsupported when virtualFileExists is false', () => {
      const target = `${MDP_WS_FILE}docs%2Fmissing.md`
      const r = resolveMarkdownLink(target, {
        currentFileUrl: virtualBase,
        virtualFileExists: () => false
      })
      expect(r.kind).toBe('unsupported')
      expect(r.shouldIntercept).toBe(false)
    })

    it('detects virtual self-link', () => {
      const r = resolveMarkdownLink(virtualBase, {
        currentFileUrl: virtualBase,
        virtualFileExists: () => true
      })
      expect(r.kind).toBe('self-link')
      expect(r.shouldIntercept).toBe(true)
    })

    it('resolves relative href from virtual workspace file', () => {
      const r = resolveMarkdownLink('b.md', {
        currentFileUrl: virtualBase,
        virtualFileExists: () => true
      })
      expect(r.kind).toBe('workspace-virtual-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('returns asset for non-markdown relative href from virtual workspace', () => {
      const r = resolveMarkdownLink('image.png', {
        currentFileUrl: virtualBase,
        virtualFileExists: () => true
      })
      expect(r.kind).toBe('asset')
      expect(r.shouldIntercept).toBe(false)
    })
  })

  describe('no currentFileUrl context', () => {
    it('resolves absolute file href without base', () => {
      const r = resolveMarkdownLink('file:///abs/path/doc.md', {})
      expect(r.kind).toBe('markdown-file')
      expect(r.shouldIntercept).toBe(true)
    })

    it('returns unsupported for relative href without base', () => {
      const r = resolveMarkdownLink('b.md', {})
      expect(r.kind).toBe('unsupported')
      expect(r.shouldIntercept).toBe(false)
    })
  })

  describe('hash edge cases', () => {
    it('preserves encoded Unicode in hash', () => {
      const r = resolve('b.md#%C4%91o%E1%BA%A1n-2')
      expect(r.kind).toBe('markdown-file')
      expect(r.hash).toBe('đoạn-2')
    })

    it('handles hash with special chars', () => {
      const r = resolve('b.md#section-1.2')
      expect(r.kind).toBe('markdown-file')
      expect(r.hash).toBe('section-1.2')
    })
  })
})
