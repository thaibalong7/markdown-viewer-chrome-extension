import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it } from 'vitest'
import { setLanguage } from '../index.js'
import { DEFAULT_SETTINGS } from '../../settings/default-settings.js'
import { ExplorerSettings } from '../../options/sections/ExplorerSettings.jsx'
import { PrivacySettings } from '../../options/sections/PrivacySettings.jsx'
import { AdvancedSettings } from '../../options/sections/AdvancedSettings.jsx'
import { AboutSettings } from '../../options/sections/AboutSettings.jsx'
import { ThemeSettings } from '../../options/sections/ThemeSettings.jsx'
import { ReaderPanel } from '../../popup/panels/ReaderPanel.jsx'
import { EditorSettingsPanel } from '../../popup/panels/EditorSettingsPanel.jsx'
import { PluginsPanel } from '../../popup/panels/PluginsPanel.jsx'
import { FileAccessCallout } from '../../popup/components/FileAccessCallout.jsx'

afterEach(() => setLanguage('en'))

it('renders catalog IDs in Vietnamese across Settings and Popup without exposing their paths', () => {
  setLanguage('vi')
  const cases = [
    [ExplorerSettings, { settings: DEFAULT_SETTINGS.explorer, draft: DEFAULT_SETTINGS.explorer, fieldErrors: {} }, 'Số cấp thư mục cần quét'],
    [PrivacySettings, { settings: DEFAULT_SETTINGS.history, draft: 20 }, 'Số tệp gần đây tối đa'],
    [AdvancedSettings, { draft: 10 }, 'Dung lượng tối đa của tệp văn bản'],
    [AboutSettings, {}, 'Giới thiệu Markdown Plus'],
    [ThemeSettings, { settings: DEFAULT_SETTINGS, busyAction: '' }, 'Sáng'],
    [ReaderPanel, { settings: DEFAULT_SETTINGS }, 'Phông chữ'],
    [EditorSettingsPanel, { settings: DEFAULT_SETTINGS }, 'Trình soạn thảo thử nghiệm'],
    [PluginsPanel, { pluginsSnapshot: DEFAULT_SETTINGS.plugins }, 'Xem trước màu'],
    [FileAccessCallout, { state: 'blocked' }, 'Cho phép truy cập tệp trên thiết bị']
  ]
  for (const [Component, props, translated] of cases) {
    const html = renderToStaticMarkup(React.createElement(Component, props))
    expect(html, Component.name).toContain(translated)
    expect(html, Component.name).not.toMatch(/(?:common|options|popup|viewer)\.[a-zA-Z]+\./)
  }
})

it('renders Chinese controls, hints, errors and confirmations across Settings and Popup', () => {
  setLanguage('zh-CN')
  const cases = [
    [ExplorerSettings, { settings: DEFAULT_SETTINGS.explorer, draft: DEFAULT_SETTINGS.explorer, fieldErrors: {} }, '文件夹扫描深度'],
    [PrivacySettings, { settings: DEFAULT_SETTINGS.history, draft: 20 }, '清除最近文件记录'],
    [AdvancedSettings, { draft: 10 }, '独立文本文件大小限制'],
    [AboutSettings, {}, '关于 Markdown Plus'],
    [ThemeSettings, { settings: DEFAULT_SETTINGS, busyAction: '' }, '内置主题'],
    [ReaderPanel, { settings: DEFAULT_SETTINGS }, '行高'],
    [EditorSettingsPanel, { settings: DEFAULT_SETTINGS }, '实验性编辑器'],
    [PluginsPanel, { pluginsSnapshot: DEFAULT_SETTINGS.plugins }, '颜色预览'],
    [FileAccessCallout, { state: 'blocked' }, '允许访问本地文件']
  ]
  for (const [Component, props, translated] of cases) {
    const html = renderToStaticMarkup(React.createElement(Component, props))
    expect(html, Component.name).toContain(translated)
    expect(html, Component.name).not.toMatch(/(?:common|options|popup|viewer)\.[a-zA-Z]+\./)
  }
})
