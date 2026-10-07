// Keep as many commands direct as fit, reserving one target for overflow.
// Header measurements include the title/badge and a separate details toggle.
export function partitionDetailsCommands(commands, { width, badgeWidth = 0, coarse, reservedCount = 0 }) {
  const size = coarse ? 44 : 28
  const available = width - (badgeWidth ? badgeWidth + 8 : 0) - reservedCount * (size + 4)
  const slots = Math.max(0, Math.floor((available + 4) / (size + 4)))
  const directCount = slots >= commands.length ? commands.length : Math.max(0, slots - 1)
  return {
    direct: commands.slice(0, directCount),
    overflow: commands.slice(directCount)
  }
}
