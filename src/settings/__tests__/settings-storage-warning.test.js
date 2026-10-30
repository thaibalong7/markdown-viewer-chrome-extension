// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Notice } from '../../shared/react/Notice.jsx'
import { useSettingsStorageWarning } from '../useSettingsStorageWarning.js'
import { setSettingsStorageWarning } from '../settings-storage-status.js'
import { STORAGE_ERRORS } from '../settings-storage-errors.js'
import { setLanguage, translateMessage } from '../../i18n/index.js'
import { MESSAGE_TYPES } from '../../messaging/index.js'

afterEach(() => { setLanguage('en'); setSettingsStorageWarning(null); delete globalThis.chrome; delete globalThis.IS_REACT_ACT_ENVIRONMENT })

it('announces a localized cache warning, updates its language and clears it when a complete snapshot arrives', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let receive
  const removeListener = vi.fn()
  globalThis.chrome = { runtime: { onMessage: {
    addListener: fn => { receive = fn }, removeListener
  } } }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function Harness() {
    const warning = useSettingsStorageWarning()
    return warning ? React.createElement(Notice, { variant: 'warning', role: 'status' }, warning) : null
  }
  try {
    setLanguage('vi')
    setSettingsStorageWarning(STORAGE_ERRORS.cached)
    await act(async () => root.render(React.createElement(Harness)))
    expect(host.querySelector('[role="status"]').textContent).toContain('chưa thể lưu thay đổi mới')
    await act(async () => setLanguage('zh-CN'))
    expect(host.textContent).toContain('目前无法保存新的更改')
    for (const text of Object.values(STORAGE_ERRORS)) expect(translateMessage(text)).not.toBe(text)
    await act(async () => receive({ type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: {} }))
    expect(host.textContent).toBe('')
  } finally {
    await act(async () => root.unmount())
    expect(removeListener).toHaveBeenCalledWith(receive)
    host.remove()
  }
})
