import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  detectMarkdownPage: vi.fn(),
  extractRawMarkdown: vi.fn(),
  createViewerRoot: vi.fn(),
  sendMessage: vi.fn(),
  appInit: vi.fn(),
  appConstructor: vi.fn()
}))

vi.mock('../../shared/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))
vi.mock('../../messaging/index.js', () => ({
  MESSAGE_TYPES: { GET_SETTINGS: 'GET_SETTINGS' },
  sendMessage: mocks.sendMessage
}))
vi.mock('../page-detector.js', () => ({ detectMarkdownPage: mocks.detectMarkdownPage }))
vi.mock('../raw-content-extractor.js', () => ({ extractRawMarkdown: mocks.extractRawMarkdown }))
vi.mock('../page-overrider.js', () => ({ createViewerRoot: mocks.createViewerRoot }))
vi.mock('../../viewer/app.js', () => ({
  MarkdownViewerApp: class {
    constructor(options) {
      mocks.appConstructor(options)
    }

    init() {
      return mocks.appInit()
    }
  }
}))

import { bootstrap } from '../bootstrap.js'

const STYLES = {
  baseCss: 'base',
  layoutCss: 'layout',
  contentCss: 'content',
  tocCss: 'toc',
  explorerCss: 'explorer'
}

function setLocation(protocol, pathname) {
  vi.stubGlobal('window', {
    location: {
      protocol,
      pathname,
      href: `${protocol}//${pathname}`
    }
  })
  vi.stubGlobal('document', {})
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.detectMarkdownPage.mockReturnValue({ isMarkdown: true, score: 5, sourceType: 'raw-pre' })
  mocks.extractRawMarkdown.mockReturnValue({ markdown: '# Fixture' })
  mocks.sendMessage.mockResolvedValue({ ok: true, data: { enabled: true } })
  mocks.appInit.mockResolvedValue(undefined)
  mocks.createViewerRoot.mockReturnValue({ root: { innerHTML: 'raw page' } })
})

describe('bootstrap direct-activation characterization', () => {
  it.each(['/README.md', '/Guide.markdown', '/notes.mdown', '/config.mdc', '/UPPER.MD'])(
    'mounts the current Markdown viewer for local %s',
    async (pathname) => {
      setLocation('file:', pathname)

      await bootstrap(STYLES)

      expect(mocks.appConstructor).toHaveBeenCalledOnce()
      expect(mocks.appInit).toHaveBeenCalledOnce()
    }
  )

  it.each([
    ['https:', '/README.md'],
    ['file:', '/notes.txt'],
    ['file:', '/README.md/']
  ])('does not mount for protocol %s and path %s', async (protocol, pathname) => {
    setLocation(protocol, pathname)

    await bootstrap(STYLES)

    expect(mocks.detectMarkdownPage).not.toHaveBeenCalled()
    expect(mocks.appConstructor).not.toHaveBeenCalled()
  })

  it('keeps an empty Markdown file unmounted', async () => {
    const emptyFixture = await readFile(
      fileURLToPath(
        new URL('../../../test/fixtures/multi-format-viewer/empty.md', import.meta.url)
      ),
      'utf8'
    )
    setLocation('file:', '/empty.md')
    mocks.extractRawMarkdown.mockReturnValue({ markdown: emptyFixture })

    await bootstrap(STYLES)

    expect(mocks.appConstructor).not.toHaveBeenCalled()
  })
})
