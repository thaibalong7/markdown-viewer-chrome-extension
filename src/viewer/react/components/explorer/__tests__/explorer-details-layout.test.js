import { describe, expect, it } from 'vitest'
import { partitionDetailsCommands } from '../explorer-details-layout.js'

const commands = ['copy-link', 'open-folder', 'navigate'].map(key => ({ key }))

describe('minimized Files command layout', () => {
  it('keeps all existing commands direct when they fit and avoids empty overflow', () => {
    expect(partitionDetailsCommands(commands, { width: 240, badgeWidth: 60, coarse: false }))
      .toEqual({ direct: commands, overflow: [] })
  })

  it('prioritizes Open, then navigation, then Copy as the available width shrinks', () => {
    const keys = width => partitionDetailsCommands(commands, { width, badgeWidth: 80, coarse: false }).direct.map(c => c.key)
    expect(keys(220)).toEqual(['copy-link', 'open-folder', 'navigate'])
    expect(keys(200)).toEqual(['open-folder'])
    expect(keys(180)).toEqual(['open-folder'])
    expect(keys(150)).toEqual([])
  })

  it('keeps all touch commands direct when they fit, and reserves overflow for future commands', () => {
    expect(partitionDetailsCommands(commands, { width: 254, badgeWidth: 60, coarse: true }))
      .toEqual({ direct: commands, overflow: [] })
    expect(partitionDetailsCommands(commands, { width: 253, badgeWidth: 60, coarse: true }))
      .toEqual({ direct: [commands[1]], overflow: [commands[0], commands[2]] })
    const future = { key: 'future-action' }
    expect(partitionDetailsCommands([...commands, future], { width: 400, badgeWidth: 60, coarse: true }))
      .toEqual({ direct: commands, overflow: [future] })
  })

  it('accounts for the full 4px gap before showing all commands', () => {
    expect(partitionDetailsCommands(commands, { width: 210, badgeWidth: 80, coarse: false }))
      .toEqual({ direct: commands, overflow: [] })
    expect(partitionDetailsCommands(commands, { width: 209, badgeWidth: 80, coarse: false }))
      .toEqual({ direct: [commands[1]], overflow: [commands[0], commands[2]] })
  })

  it('puts actions in overflow before the first measurement', () => {
    expect(partitionDetailsCommands(commands, { width: 0, badgeWidth: 0, coarse: false }))
      .toEqual({ direct: [], overflow: commands })
  })

  it.each([false, true])('never duplicates commands and fits measured rows with coarse=%s', coarse => {
    for (const badgeWidth of [56, 80]) {
      for (let width = 178; width <= 340; width += 4) {
        const { direct, overflow } = partitionDetailsCommands(commands, { width, badgeWidth, coarse })
        expect(new Set([...direct, ...overflow]).size).toBe(commands.length)
        expect(direct.length + overflow.length).toBe(commands.length)
        const count = direct.length + 1 + Number(overflow.length > 0)
        expect(badgeWidth + 6 + count * (coarse ? 44 : 28) + (count - 1) * 4).toBeLessThanOrEqual(width)
      }
    }
  })
})
