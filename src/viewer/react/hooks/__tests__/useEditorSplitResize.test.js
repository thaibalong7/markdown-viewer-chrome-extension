import { describe, expect, it } from 'vitest'
import { clampEditorSplitWidth } from '../useEditorSplitResize.js'

describe('clampEditorSplitWidth', () => {
  it('clamps the editor width while preserving a minimum preview width', () => {
    expect(clampEditorSplitWidth(100, 1000, 240)).toBe(240)
    expect(clampEditorSplitWidth(900, 1000, 240)).toBe(760)
    expect(clampEditorSplitWidth(520, 1000, 240)).toBe(520)
  })

  it('shrinks the minimum pane width when the available width is narrow', () => {
    expect(clampEditorSplitWidth(240, 300, 240)).toBe(150)
    expect(clampEditorSplitWidth(20, 300, 240)).toBe(150)
  })

  it('falls back to the middle when the requested width is invalid', () => {
    expect(clampEditorSplitWidth(Number.NaN, 900, 240)).toBe(450)
  })
})
