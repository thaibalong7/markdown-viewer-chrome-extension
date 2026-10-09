import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FolderRow } from '../FolderRow.jsx'
import { ActionMenu } from '../../common/ActionMenu.jsx'
import { Tooltip } from '../../Tooltip.jsx'
import { copyFolderRowText } from '../../../../actions/folder-row-actions.js'

const showToast = vi.hoisted(() => vi.fn())
vi.mock('react', async original => ({
  ...await original(), useState: initial => [initial, vi.fn()], useRef: () => ({ current: null }),
  useCallback: fn => fn, useEffect: () => {}, useLayoutEffect: () => {}
}))
vi.mock('../../../contexts/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }))
vi.mock('../../../../actions/folder-row-actions.js', async original => ({
  ...await original(), copyFolderRowText: vi.fn(async () => {})
}))

const node = { type: 'folder', href: 'mdp-ws-dir:design', name: 'design', depth: 2, children: [] }
function mount(expanded = true) {
  const onToggleFolder = vi.fn()
  const tree = FolderRow({ onToggleFolder,
    treeRow: { node, expanded, depth: node.depth, fileCount: 12, path: 'docs/design', containsActive: true, guides: [], stem: false } })
  const children = React.Children.toArray(tree.props.children)
  const disclosure = children.find(child => child.type === Tooltip).props.children
  const menu = children.find(child => child.type === ActionMenu)
  return { tree, disclosure, menu, onToggleFolder }
}

describe('Files folder count and More actions', () => {
  it('keeps the count and separate disclosure/More buttons with meaningful names', () => {
    const m = mount()
    const html = renderToStaticMarkup(m.tree)
    expect(html).toContain('mdp-explorer__folder-count')
    expect(html).toContain('>12</span>')
    expect(html).toContain('--mdp-tree-row-indent:12px')
    expect(html).toContain('aria-label="More actions for design"')
    expect(html).not.toContain('current-dot')
    m.disclosure.props.onClick()
    expect(m.onToggleFolder).toHaveBeenCalledWith(node.href)
  })

  it('opening More does not toggle the folder; only its explicit toggle item does', () => {
    const m = mount(false)
    m.menu.props.onToggle()
    expect(m.onToggleFolder).not.toHaveBeenCalled()
    const item = m.menu.props.items[0]
    expect(item.label).toBe('Expand folder')
    expect(item.restoreFocus).toBe(false)
    item.onClick()
    expect(m.onToggleFolder).toHaveBeenCalledExactlyOnceWith(node.href)
  })

  it('copies workspace-relative paths and reports clipboard failure', async () => {
    vi.mocked(copyFolderRowText).mockClear()
    const m = mount()
    m.menu.props.items[2].onClick()
    await Promise.resolve()
    expect(copyFolderRowText).toHaveBeenCalledWith('docs/design')
    vi.mocked(copyFolderRowText).mockRejectedValueOnce(new Error('denied'))
    m.menu.props.items[1].onClick()
    await Promise.resolve()
    expect(showToast).toHaveBeenCalledWith('Could not copy folder name', { variant: 'error' })
  })
})
