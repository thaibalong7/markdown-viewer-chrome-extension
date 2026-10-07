import { describe, expect, it } from 'vitest'
import { partitionDetailsCommands } from '../explorer-details-layout.js'

const commands = ['open-folder', 'copy-link', 'navigate'].map(key => ({ key }))
const budget = (width, coarse = false) => ({ width, badgeWidth: 80, coarse, reservedCount: 1 })

describe('Files command layout', () => {
  it.each([[false, 212], [true, 276]])('shows all commands at the exact fit boundary, coarse=%s', (coarse, width) => {
    expect(partitionDetailsCommands(commands, budget(width, coarse)))
      .toEqual({ direct: commands, overflow: [] })
    expect(partitionDetailsCommands(commands, budget(width - 1, coarse)))
      .toEqual({ direct: commands.slice(0, 1), overflow: commands.slice(1) })
  })

  it('uses the full detail footer without reserving title or disclosure space', () => {
    expect(partitionDetailsCommands(commands, { width: 92, coarse: false }))
      .toEqual({ direct: commands, overflow: [] })
    expect(partitionDetailsCommands(commands, { width: 91, coarse: false }))
      .toEqual({ direct: commands.slice(0, 1), overflow: commands.slice(1) })
  })

  it('puts commands in More before measurement and when only the minimum controls fit', () => {
    expect(partitionDetailsCommands(commands, budget(0))).toEqual({ direct: [], overflow: commands })
    expect(partitionDetailsCommands(commands, budget(148))).toEqual({ direct: [], overflow: commands })
  })

  it.each([false, true])('preserves command order and fits the measured budget, coarse=%s', coarse => {
    const size = coarse ? 44 : 28
    for (let width = 80 + 8 + size * 2 + 4; width <= 500; width++) {
      const { direct, overflow } = partitionDetailsCommands(commands, budget(width, coarse))
      expect([...direct, ...overflow]).toEqual(commands)
      const count = direct.length + Number(overflow.length > 0) + 1
      expect(80 + 8 + count * size + (count - 1) * 4).toBeLessThanOrEqual(width)
    }
  })
})
