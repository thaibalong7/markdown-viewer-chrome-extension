import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'
import { resolveMarkdownLink } from '../link-resolver.js'

const FIXTURE_ROOT = new URL(
  '../../../../test/fixtures/multi-format-viewer/',
  import.meta.url
)

function markdownLinks(source) {
  return [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1])
}

describe('fixture-backed Markdown navigation characterization', () => {
  it('intercepts real Markdown links with spaces, Unicode, and a heading hash', async () => {
    const source = await readFile(
      fileURLToPath(new URL('navigation/index.md', FIXTURE_ROOT)),
      'utf8'
    )
    const [guideHref] = markdownLinks(source)

    expect(
      resolveMarkdownLink(guideHref, {
        currentFileUrl: 'file:///fixtures/navigation/index.md'
      })
    ).toEqual({
      kind: 'document-file',
      resolvedUrl: 'file:///fixtures/navigation/Guide%20Notes.markdown',
      hash: 'cài-đặt',
      shouldIntercept: true
    })
  })

  it('resolves a relative link between virtual workspace fixtures', async () => {
    const source = await readFile(
      fileURLToPath(new URL('workspace/Dự án/README.md', FIXTURE_ROOT)),
      'utf8'
    )
    const [guideHref] = markdownLinks(source)
    const currentFileUrl = `${MDP_WS_FILE}${encodeURIComponent('Dự án/README.md')}`
    const targetUrl = `${MDP_WS_FILE}${encodeURIComponent('Dự án/docs/Hướng dẫn.mdown')}`

    expect(
      resolveMarkdownLink(guideHref, {
        currentFileUrl,
        virtualFileExists: (href) => href === targetUrl
      })
    ).toEqual({
      kind: 'workspace-virtual-file',
      resolvedUrl: targetUrl,
      hash: null,
      shouldIntercept: true
    })
  })
})
