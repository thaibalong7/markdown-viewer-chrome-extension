import { clearScreenDown, cursorTo, emitKeypressEvents, moveCursor } from 'node:readline'
import { createInterface } from 'node:readline/promises'

export async function selectBump({ choices, paint, colors, input = process.stdin, output = process.stdout }) {
  const available = choices.filter(choice => !choice.disabled)
  if (!available.length) throw new Error('No version bump is available within Chrome limits. Use --bump none.')
  if (!input.isTTY || !output.isTTY || process.env.TERM === 'dumb') {
    const prompt = createInterface({ input, output, terminal: false })
    const abort = new AbortController()
    prompt.once('close', () => abort.abort())
    try {
      for (const [index, choice] of choices.entries()) {
        output.write(`${index + 1}. ${choice.value}: ${choice.description} (${choice.next})\n`)
      }
      const defaultNumber = choices.indexOf(available[0]) + 1
      while (true) {
        const answer = (await prompt.question(`Bump type (number or name) [${defaultNumber}]: `, { signal: abort.signal })).trim().toLowerCase()
        const choice = !answer ? available[0] : choices.find((item, index) => answer === String(index + 1) || answer === item.value)
        if (choice && !choice.disabled) return choice.value
        output.write('Choose an available bump type.\n')
      }
    } finally {
      prompt.close()
    }
  }

  return new Promise((resolve, reject) => {
    let selected = 0
    let rows = 0
    const labelWidth = Math.max(...choices.map(choice => choice.value.length))
    const wasRaw = Boolean(input.isRaw)
    const wasPaused = input.isPaused()
    const fit = text => text.slice(0, Math.max(1, (output.columns || 80) - 1))
    const erase = () => {
      if (!rows) return
      moveCursor(output, 0, -rows)
      cursorTo(output, 0)
      clearScreenDown(output)
    }
    const render = () => {
      erase()
      const lines = choices.flatMap(choice => {
        const active = choice === available[selected]
        const color = choice.disabled ? '2' : colors[choice.value]
        const label = `${active ? '>' : ' '} ${choice.value.padEnd(labelWidth)}  ${choice.next}`
        return [paint(active ? `1;${color}` : color, fit(label)), paint('2', fit(`${' '.repeat(labelWidth + 4)}${choice.description}`))]
      })
      lines.push(paint('2', fit('Use Up/Down to choose, Enter to confirm, Ctrl+C to cancel.')))
      output.write(`${lines.join('\n')}\n`)
      rows = lines.length
    }
    const finish = error => {
      input.off('keypress', onKeypress)
      input.off('end', onEnd)
      output.off('resize', render)
      process.off('SIGINT', onInterrupt)
      process.off('SIGTERM', onTerminate)
      input.setRawMode(wasRaw)
      if (wasPaused) input.pause()
      erase()
      output.write('\u001b[?25h')
      if (error) reject(error)
      else {
        const choice = available[selected]
        output.write(`Selected: ${paint(colors[choice.value], choice.value)} (${choice.next})\n`)
        resolve(choice.value)
      }
    }
    const onKeypress = (_, key = {}) => {
      if (key.ctrl && key.name === 'c') return finish(new Error('Aborted with Ctrl+C'))
      if (key.name === 'escape' || (key.ctrl && key.name === 'd')) return finish(new Error('Bump selection cancelled.'))
      if (key.name === 'return' || key.name === 'enter') return finish()
      if (key.name === 'up') selected = (selected - 1 + available.length) % available.length
      else if (key.name === 'down') selected = (selected + 1) % available.length
      else return
      render()
    }
    const onEnd = () => finish(new Error('Input closed during bump selection.'))
    const onInterrupt = () => finish(new Error('Aborted with Ctrl+C'))
    const onTerminate = () => finish(new Error('Bump selection terminated.'))
    emitKeypressEvents(input)
    input.setRawMode(true)
    input.on('keypress', onKeypress)
    input.once('end', onEnd)
    output.on('resize', render)
    process.on('SIGINT', onInterrupt)
    process.on('SIGTERM', onTerminate)
    input.resume()
    output.write('\u001b[?25l')
    render()
  })
}
