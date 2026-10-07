// Reserve space for the badge, disclosure and (when needed) overflow trigger.
// Unknown commands start in overflow, so future actions cannot lengthen this row.
export function partitionDetailsCommands(commands, { width, badgeWidth, coarse }) {
  const size = coarse ? 44 : 28
  const available = width - badgeWidth - 6
  const priority = ['open-folder', 'navigate', 'copy-link']
  const directKeys = priority.filter(key => commands.some(command => command.key === key))
  const required = () => {
    const hasOverflow = directKeys.length < commands.length
    const count = directKeys.length + 1 + (hasOverflow ? 1 : 0)
    return count * size + (count - 1) * 4
  }
  while (directKeys.length && required() > available) directKeys.pop()
  return {
    direct: commands.filter(command => directKeys.includes(command.key)),
    overflow: commands.filter(command => !directKeys.includes(command.key))
  }
}
