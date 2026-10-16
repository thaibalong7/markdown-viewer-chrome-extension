// @vitest-environment jsdom
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocale, setLanguage, translateMessage } from '../index.js'
import { useLanguageUpdates } from '../react.js'
import { GeneralSettings } from '../../options/sections/GeneralSettings.jsx'
import { DocumentStats } from '../../viewer/react/components/DocumentStats.jsx'
import { ChangeReviewContent } from '../../viewer/react/components/ChangeReviewPanel.jsx'
import { FileHistoryPanel } from '../../popup/panels/FileHistoryPanel.jsx'
import { CodeToolbar } from '../../viewer/react/content/toolbars/CodeToolbar.jsx'
import { destroyContentUi, mountContentUi } from '../../viewer/react/content/mount-content-ui.jsx'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { confirmResetAllSettings } from '../../options/options-actions.js'

let root, host, receiver
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  setLanguage('en')
  globalThis.chrome = { runtime: { onMessage: {
    addListener: vi.fn(listener => { receiver = listener }), removeListener: vi.fn()
  } } }
  host = document.createElement('div'); host.id = 'mdp-viewer-root'; document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => { destroyContentUi(host); root.unmount() })
  document.body.replaceChildren(); setLanguage('en'); delete globalThis.chrome
  vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

it('switches mounted controls and independent portals both ways without replacing document/draft nodes', async () => {
  function Harness() {
    const [settings, setSettings] = useState({ language: 'en' })
    useLanguageUpdates(setSettings)
    return React.createElement(React.Fragment, null,
      React.createElement(GeneralSettings, { settings, onLanguageChange: vi.fn() }),
      React.createElement(DocumentStats, { source: 'Hello world' }),
      React.createElement('textarea', { defaultValue: 'Settings', 'aria-label': 'draft' }), React.createElement('article'))
  }
  await act(async () => root.render(React.createElement(Harness)))
  const article = host.querySelector('article')
  article.textContent = 'Settings'
  const draft = host.querySelector('textarea'); draft.focus(); draft.selectionStart = 3
  const slot = document.createElement('div'); article.after(slot)
  await act(async () => mountContentUi(slot, CodeToolbar, { pre: article, language: 'js', copyAction: vi.fn() }))
  await act(async () => receiver({ type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: { language: 'vi' } }))
  expect(host.querySelector('label[for="general-language"]').textContent).toBe('Ngôn ngữ giao diện')
  expect(host.querySelector('#general-language').value).toBe('vi')
  expect(host.querySelector('[aria-label="Sao chép mã vào bộ nhớ tạm"]')).not.toBeNull()
  expect(host.textContent).toContain('2 từ')
  expect(host.querySelector('textarea')).toBe(draft)
  expect(draft.value).toBe('Settings'); expect(draft.selectionStart).toBe(3)
  expect(document.activeElement).toBe(draft); expect(article.textContent).toBe('Settings')
  await act(async () => receiver({ type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: { language: 'zh-CN' } }))
  expect(host.querySelector('label[for="general-language"]').textContent).toBe('界面语言')
  expect(host.querySelector('#general-language').value).toBe('zh-CN')
  expect(host.querySelector('[aria-label="将代码复制到剪贴板"]')).not.toBeNull()
  expect(host.textContent).toContain('2 个词')
  expect(host.querySelector('textarea')).toBe(draft)
  expect(draft.value).toBe('Settings'); expect(draft.selectionStart).toBe(3)
  expect(document.activeElement).toBe(draft); expect(article.textContent).toBe('Settings')
  await act(async () => setLanguage('en'))
  expect(host.querySelector('[aria-label="Copy code to clipboard"]')).not.toBeNull()
  expect(host.textContent).toContain('2 words')
  expect(host.querySelector('textarea')).toBe(draft)
})

it('renders Vietnamese dates and counts while preserving history names and diff source verbatim', () => {
  setLanguage('vi')
  const history = renderToStaticMarkup(React.createElement(FileHistoryPanel, { history: [
    { title: 'Settings', url: 'file:///tmp/Settings.md', openedAt: Date.UTC(2026, 9, 15) },
    { title: 'General', url: 'file:///tmp/General.md', openedAt: Date.UTC(2026, 9, 15) }
  ] }))
  expect(history).toContain('2 tệp gần đây'); expect(history).toContain('popup-history-item__title">Settings</span>'); expect(history).toContain('popup-history-item__title">General</span>')
  expect(history).not.toContain('tệp gần đâys')
  const review = { added: 1, removed: 0, sections: [], hunks: [{ id: 0, rows: [
    { type: 'added', text: 'Settings', newLine: 1, oldLine: null, ending: 'LF' }
  ] }] }
  const html = renderToStaticMarkup(React.createElement(ChangeReviewContent, { review, activeHunk: 0, registerHunk: () => {} }))
  expect(html).toContain('<code>Settings</code>'); expect(html).toContain('Đoạn thay đổi')
})

it('keeps diagnostic interpolation and native confirmation readable in Vietnamese', () => {
  setLanguage('vi')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  expect(confirmResetAllSettings()).toBe(false)
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Khôi phục toàn bộ cài đặt'))
  expect(translateMessage('Copied folder path')).toBe('Đã sao chép đường dẫn thư mục')
})

it('removes extension listeners when the page unmounts', async () => {
  function Page() { useLanguageUpdates(); return null }
  await act(async () => root.render(React.createElement(Page)))
  const remove = chrome.runtime.onMessage.removeListener
  await act(async () => root.render(null))
  expect(remove).toHaveBeenCalledWith(receiver)
  expect(getLocale()).toBe('en')
})

it('translates the workspace file prompt as live UI and removes it when a document opens', async () => {
  const { createDocumentSessionController } = await import('../../viewer/app/documentSessionController.js')
  const { createRenderController } = await import('../../viewer/app/renderController.js')
  const { createDocumentIdentity } = await import('../../viewer/documents/document-model.js')
  const article = document.createElement('article')
  article.className = 'mdp-markdown-body'
  host.append(article)
  const key = 'viewer.useexplorer.selectASupportedFileFromTheFilesPanel'
  let renderer
  const session = createDocumentSessionController({
    initialDocument: createDocumentIdentity('file:///tmp/start.md'),
    initialText: '# Start',
    loadDocument: async () => ({ text: '# Opened document' }),
    render: options => renderer.render(options)
  })
  renderer = createRenderController({
    getLoadedDocument: session.getLoadedDocument,
    getSettings: () => ({}),
    getArticleEl: () => article,
    getArticleInteractions: () => null,
    getReactHandle: () => null,
    getScrollRoot: () => null,
    container: host
  })

  try {
    await act(async () => { setLanguage('vi'); await session.showPlaceholder(key) })
    const prompt = article.querySelector('[role="status"]')
    expect(prompt.textContent).toBe('Chọn tệp được hỗ trợ từ bảng Tệp.')
    expect(article.textContent).not.toContain(key)
    expect(session.getLoadedDocument().text).toBe('')
    expect(renderer.getLastSuccessfulRenderMarkdown()).toBe('')

    await act(async () => setLanguage('zh-CN'))
    expect(article.querySelector('[role="status"]')).toBe(prompt)
    expect(prompt.textContent).toBe('请从文件面板中选择受支持的文件。')
    expect(session.getLoadedDocument().text).toBe('')

    await act(async () => setLanguage('en'))
    expect(article.querySelector('[role="status"]')).toBe(prompt)
    expect(prompt.textContent).toBe('Select a supported file from the Files panel.')

    await act(async () => session.openDocument('file:///tmp/opened.md'))
    expect(article.querySelector('[role="status"]')).toBeNull()
    expect(article.querySelector('h1').textContent).toContain('Opened document')
  } finally {
    await act(async () => { renderer.destroy(); session.destroy() })
  }
})

it('keeps a visible parameterized toast translated across language changes', async () => {
  const { ToastProvider } = await import('../../viewer/react/contexts/ToastContext.jsx')
  const { Toast } = await import('../../viewer/react/components/Toast.jsx')
  const { message } = await import('../index.js')
  let showToast
  await act(async () => root.render(React.createElement(ToastProvider, {
    onShowToastReady: show => { showToast = show }
  }, React.createElement(Toast))))
  await act(async () => showToast(message('viewer.actions.export.exportedValue', { 0: 'options.general.title.html' })))
  expect(host.querySelector('.mdp-toast').textContent).toBe('Exported options.general.title.html')
  await act(async () => setLanguage('vi'))
  expect(host.querySelector('.mdp-toast').textContent).toBe('Đã xuất options.general.title.html')
  expect(host.querySelector('.mdp-toast').classList.contains('is-visible')).toBe(true)
  await act(async () => setLanguage('zh-CN'))
  expect(host.querySelector('.mdp-toast').textContent).toBe('已导出 options.general.title.html')
  expect(host.querySelector('.mdp-toast').classList.contains('is-visible')).toBe(true)
})

it('shows Chinese history, literal diff source and distinct draft-loss warnings', async () => {
  const { EditorUpdateWarning } = await import('../../viewer/react/components/EditorUpdateConfirmation.jsx')
  setLanguage('zh-CN')
  const history = renderToStaticMarkup(React.createElement(FileHistoryPanel, { history: [
    { title: 'options.general.title', url: 'file:///tmp/options.general.title.md', openedAt: Date.UTC(2026, 9, 15) }
  ] }))
  expect(history).toContain('最近文件：1 个')
  expect(history).toContain('popup-history-item__title">options.general.title</span>')
  const review = { sections: [], hunks: [{ id: 0, rows: [
    { type: 'added', text: 'options.general.title', newLine: 1, oldLine: null, ending: 'LF' },
    { type: 'equal', text: '原文', newLine: 2, oldLine: 1, ending: 'LF' },
    { type: 'removed', text: 'old', newLine: null, oldLine: 2, ending: 'LF' }
  ] }], added: 1, removed: 0 }
  const html = renderToStaticMarkup(React.createElement(ChangeReviewContent, { review, activeHunk: 0, registerHunk: () => {} }))
  expect(html).toContain('<code>options.general.title</code>')
  expect(html).toContain('更改区域')
  expect(html).toContain('aria-label="新增"')
  expect(html).toContain('aria-label="删除"')
  expect(html).toContain('aria-label="未更改"')
  const dirty = renderToStaticMarkup(React.createElement(EditorUpdateWarning, { dirty: true }))
  expect(dirty).toContain('草稿无法恢复')
  const clean = renderToStaticMarkup(React.createElement(EditorUpdateWarning, { dirty: false }))
  expect(clean).toContain('关闭编辑器')
  expect(clean).not.toContain('无法恢复')
})

it('resolves image accessibility messages to text and keeps key-like alt text literal', async () => {
  const { createArticleInteractions } = await import('../../viewer/article-interactions.js')
  const article = document.createElement('article')
  article.className = 'mdp-markdown-body'
  const images = ['options.general.title', ''].map(alt => {
    const image = document.createElement('img')
    image.alt = alt
    Object.defineProperties(image, { naturalWidth: { value: 100 }, naturalHeight: { value: 100 } })
    article.append(image)
    return image
  })
  host.append(article)
  const interactions = createArticleInteractions({ getArticle: () => article, getScrollRoot: () => host })
  try {
    setLanguage('zh-CN')
    interactions.prepareZoomableImages()
    expect(images[0].getAttribute('aria-label')).toBe('缩放图片：options.general.title')
    expect(images[1].getAttribute('aria-label')).toBe('打开图片缩放视图')
    setLanguage('en')
    interactions.prepareZoomableImages()
    expect(images[0].getAttribute('aria-label')).toBe('Zoom image: options.general.title')
    expect(images[1].getAttribute('aria-label')).toBe('Open image zoom view')
  } finally { interactions.destroy() }
})

it('localizes scan progress and combined limit notices with literal paths', async () => {
  const { createExplorerViewActions } = await import('../../viewer/react/hooks/explorer/createExplorerViewActions.js')
  const { buildDepthNotice } = await import('../../viewer/explorer/explorer-tree-utils.js')
  const { ExplorerProgress } = await import('../../viewer/react/components/explorer/ExplorerProgress.jsx')
  const { t } = await import('../index.js')
  let state = { view: 'progress' }
  const actions = createExplorerViewActions({ stateRef: { current: state }, safePatch: patch => { state = { ...state, ...patch } } })
  actions.updateProgressLoading({ scannedFiles: 1234, scannedFolders: 12, currentFolder: 'file:///tmp/options.general.title/' })
  setLanguage('vi')
  const html = renderToStaticMarkup(React.createElement(ExplorerProgress, { headline: 'viewer.explorer.context.scanningWorkspace', text: state.progressText }))
  expect(html).toContain('Đang quét… 1.234 tệp, 12 thư mục')
  expect(html).toContain('/tmp/options.general.title/')
  const notice = buildDepthNotice({ skippedByDepth: 2, hitFileLimit: true, hitFolderLimit: true }, 4)
  expect(t(notice)).toContain('độ sâu: 4')
  expect(t(notice)).toContain('giới hạn số tệp')
  expect(t(notice)).toContain('giới hạn số thư mục')
  expect(t(notice)).not.toMatch(/viewer\./)
  setLanguage('en')
  expect(t(notice)).toContain('depth limit: 4')
})

it('makes clearing history explicit without implying that local files will be deleted', async () => {
  const { PrivacySettings } = await import('../../options/sections/PrivacySettings.jsx')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const clear = vi.fn()
  setLanguage('vi')
  await act(async () => root.render(React.createElement(PrivacySettings, {
    settings: { enabled: true }, draft: 20, busyAction: '', onClear: clear
  })))
  const button = [...host.querySelectorAll('button')].find(node => node.textContent === 'Xóa danh sách')
  expect(button).toBeDefined()
  await act(async () => button.click())
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('không xóa tệp gốc'))
  expect(clear).not.toHaveBeenCalled()
})

it('distinguishes loss of an unsaved draft from closing an editor with no pending changes', async () => {
  const { EditorUpdateWarning } = await import('../../viewer/react/components/EditorUpdateConfirmation.jsx')
  setLanguage('vi')
  const dirty = renderToStaticMarkup(React.createElement(EditorUpdateWarning, { dirty: true }))
  expect(dirty).toContain('Các thay đổi chưa lưu')
  expect(dirty).toContain('không thể khôi phục')
  const clean = renderToStaticMarkup(React.createElement(EditorUpdateWarning, { dirty: false }))
  expect(clean).toContain('thoát chế độ chỉnh sửa')
  expect(clean).toContain('bản đã lưu')
  expect(clean).not.toContain('không thể khôi phục')
})
