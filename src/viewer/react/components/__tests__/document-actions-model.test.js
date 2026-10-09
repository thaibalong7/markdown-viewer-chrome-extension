import { describe, expect, it, vi } from 'vitest'
import { createDocumentActions, getDocumentActionsSize, getOverflowDocumentActions, orderDocumentActions, partitionDocumentActions } from '../document-actions-model.js'

function context(overrides = {}) {
  return {
    editorState: { enabled: false, dirty: false }, watchState: { available: true },
    controls: { updates: 'watch', review: 'review' }, canReview: false,
    canToggleTheme: true, themeToggleTarget: 'dark', canEdit: true, canCopyLink: true,
    canPrint: true, canExport: true, exportItems: [
      { id: 'html', label: 'Export HTML', onClick: vi.fn() },
      { id: 'word', label: 'Export Word (.doc)', onClick: vi.fn() }
    ], ...overrides
  }
}
const ids = actions => actions.map(action => action.id)

describe('Direct icons action catalog', () => {
  it('keeps two quick actions followed by one cohesive Document group and Output', () => {
    const actions = createDocumentActions(context({ canReview: true }))
    expect(ids(actions)).toEqual(['updates', 'theme', 'review', 'edit', 'copy', 'print', 'export'])
    expect(actions.map(action => action.group)).toEqual(['quick', 'quick', 'document', 'document', 'document', 'output', 'output'])
    expect(actions.filter(action => action.pinned).map(action => action.id)).toEqual(['updates', 'theme', 'review'])
    expect(actions.find(action => action.id === 'theme').pressed).toBeUndefined()
  })
  it('retains an open review even when its candidate is cleared, and does not invent custom-theme toggles', () => {
    expect(ids(createDocumentActions(context({ canReview: true, watchState: { available: true, reviewPair: null } })))).toContain('review')
    expect(ids(createDocumentActions(context({ canToggleTheme: false })))).not.toContain('theme')
    expect(ids(createDocumentActions(context({ canReview: false })))).not.toContain('review')
  })
  it('orders Save before Done and keeps editing protections and capabilities', () => {
    const actions = createDocumentActions(context({ editorState: { enabled: true, dirty: true }, saving: true, canReview: true }))
    expect(ids(actions)).toEqual(['updates', 'theme', 'review', 'save', 'edit', 'focus', 'copy'])
    expect(actions.find(action => action.id === 'save')).toMatchObject({ disabled: true, busy: true })
    expect(actions.find(action => action.id === 'edit')).toMatchObject({ disabled: true, label: 'Exit edit mode' })
    expect(ids(createDocumentActions(context({ canEdit: false, canExport: false })))).toEqual(['updates', 'theme', 'copy', 'print'])
  })
  it('keeps disabled commands in place and preserves their reason and callback', () => {
    const onCopyLinkClick = vi.fn()
    const actions = createDocumentActions(context({ canCopyLink: false, onCopyLinkClick, isLoading: true }))
    const copy = actions.find(action => action.id === 'copy')
    expect(copy.disabled).toBe(true)
    expect(copy.tooltip).toContain('workspace virtual')
    expect(copy.onClick).toBe(onCopyLinkClick)
    expect(actions.find(action => action.id === 'theme').disabled).not.toBe(true)
  })
})

describe('prefix overflow', () => {
  it('uses the same deterministic budget for width and vertical height', () => {
    const actions = createDocumentActions(context({ canReview: true }))
    for (const controlSize of [28, 44]) {
      let previousCount = 0
      for (let availableSize = 196; availableSize <= 600; availableSize++) {
        const metrics = { availableSize, controlSize }
        const result = partitionDocumentActions(actions, metrics)
        expect(result.direct).toEqual(actions.slice(0, result.direct.length))
        expect([...result.direct, ...result.overflow]).toEqual(actions)
        expect(ids(result.direct).slice(0, 3)).toEqual(['updates', 'theme', 'review'])
        expect(result.direct.length).toBeGreaterThanOrEqual(previousCount)
        expect(getDocumentActionsSize([...result.direct, ...(result.overflow.length ? [{ id: 'more' }] : [])], metrics)).toBeLessThanOrEqual(availableSize)
        previousCount = result.direct.length
      }
    }
  })
  it('reserves More, counts dividers, and never shrinks touch targets', () => {
    const actions = createDocumentActions(context({ canReview: true }))
    const result = partitionDocumentActions(actions, { availableSize: 198, controlSize: 44 })
    expect(ids(result.direct)).toEqual(['updates', 'theme', 'review'])
    expect(ids(result.overflow)).toEqual(['edit', 'copy', 'print', 'export'])
    expect(ids(partitionDocumentActions(actions, { availableSize: 198, controlSize: 28 }).direct)).toEqual(['updates', 'theme', 'review', 'edit', 'copy'])
  })
  it('flattens export only in More, preserving callbacks and disabled state', () => {
    const actions = createDocumentActions(context({ isLoading: true }))
    const exported = actions.find(action => action.id === 'export')
    const overflow = getOverflowDocumentActions([exported])
    expect(ids(overflow)).toEqual(['html', 'word'])
    expect(overflow[0].onClick).toBe(exported.items[0].onClick)
    expect(overflow.every(action => action.disabled && action.group === 'output')).toBe(true)
  })
  it('accepts new actions without changing toolbar or overflow code', () => {
    const extra = { id: 'future', group: 'document', order: 45, label: 'Future action', icon: 'info', onClick: vi.fn() }
    const actions = orderDocumentActions([...createDocumentActions(context()), extra])
    expect(ids(actions)).toEqual(['updates', 'theme', 'edit', 'future', 'copy', 'print', 'export'])
    const { overflow } = partitionDocumentActions(actions, { availableSize: 196, controlSize: 44 })
    expect(getOverflowDocumentActions(overflow).find(action => action.id === 'future')).toBe(extra)
  })
  it('handles empty lists and rejects invalid catalog entries', () => {
    expect(partitionDocumentActions([])).toEqual({ direct: [], overflow: [] })
    expect(() => orderDocumentActions([{ id: 'bad', group: 'missing' }])).toThrow('Unknown')
    expect(() => orderDocumentActions([{ id: 'same', group: 'quick' }, { id: 'same', group: 'quick' }])).toThrow('Duplicate')
    expect(() => orderDocumentActions([{ id: 'stateful', group: 'quick', control: 'watch' }])).toThrow('must be pinned')
  })
})
