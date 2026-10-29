import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { setTimeout } from 'node:timers/promises'
import { afterEach, beforeEach, test, vi } from 'vitest'
import { selectBump } from '../release-prompt.mjs'

beforeEach(() => vi.stubEnv('TERM', 'xterm-256color'))
afterEach(() => vi.unstubAllEnvs())

const choices = [
  { value: 'patch', description: 'Bug fixes', next: '1.2.3 -> 1.2.4' },
  { value: 'minor', description: 'New features', next: '1.2.3 -> 1.3.0' },
  { value: 'major', description: 'Breaking changes', next: '1.2.3 -> 2.0.0' },
  { value: 'revision', description: 'Fourth number', next: '1.2.3 -> 1.2.3.1' }
]

function terminal(t, { tty = true, columns = 80, raw = false } = {}) {
  const input = new PassThrough()
  input.pause()
  const output = new PassThrough()
  input.isTTY = true
  input.isRaw = raw
  input.setRawMode = value => { input.isRaw = value }
  output.isTTY = tty
  output.columns = columns
  let text = ''
  output.on('data', chunk => { text += chunk.toString() })
  t.onTestFinished(() => { input.destroy(); output.destroy() })
  return {
    input, output,
    text: () => text,
    select: (options = {}) => selectBump({
      choices, paint: (_, text) => text, colors: { patch: '32', minor: '36', major: '35', revision: '34' },
      input, output, ...options
    })
  }
}

for (const [label, keys, expected] of [
  ['Enter accepts the default', '\r', 'patch'],
  ['Down chooses minor', '\u001b[B\r', 'minor'],
  ['two Down presses choose major', '\u001b[B\u001b[B\r', 'major'],
  ['Up wraps to revision', '\u001b[A\r', 'revision'],
  ['three Down presses choose revision', '\u001b[B\u001b[B\u001b[B\r', 'revision']
]) {
  test(label, async t => {
    const tty = terminal(t)
    const listeners = process.listenerCount('SIGINT')
    const pending = tty.select()
    assert.equal(tty.input.isRaw, true)
    tty.input.write(keys)
    assert.equal(await pending, expected)
    assert.equal(tty.input.isRaw, false)
    assert.equal(tty.input.isPaused(), true)
    assert.equal(process.listenerCount('SIGINT'), listeners)
    assert.match(tty.text(), new RegExp(`Selected: ${expected}`))
    assert.ok(tty.text().includes('\u001b[?25h'))
  })
}

test('arrow navigation skips unavailable choices', async t => {
  const tty = terminal(t)
  const pending = tty.select({ choices: choices.map(choice => ({ ...choice, disabled: choice.value === 'minor' })) })
  tty.input.write('\u001b[B\r')
  assert.equal(await pending, 'major')
})

test('Ctrl+C cancels and restores raw mode, cursor, and key listeners', async t => {
  const tty = terminal(t, { raw: true })
  const pending = tty.select()
  const rejected = assert.rejects(pending, /Ctrl\+C/)
  tty.input.write('\u0003')
  await rejected
  assert.equal(tty.input.isRaw, true)
  assert.equal(tty.input.listenerCount('keypress'), 0)
  assert.ok(tty.text().includes('\u001b[?25h'))
})

test('EOF cancels selection and restores terminal state', async t => {
  const tty = terminal(t)
  const pending = tty.select()
  const rejected = assert.rejects(pending, /Input closed/)
  tty.input.end()
  await rejected
  assert.equal(tty.input.isRaw, false)
})

test('narrow terminals keep menu lines within the available width', async t => {
  const tty = terminal(t, { columns: 24 })
  const pending = tty.select()
  const visible = tty.text().replace(/\u001b\[[?\d;]*[A-Za-z]/g, '')
  assert.ok(visible.trimEnd().split('\n').every(line => line.length <= 23))
  tty.input.write('\r')
  await pending
})

test('redirected output falls back to numbers without terminal controls', async t => {
  const tty = terminal(t, { tty: false })
  const pending = tty.select()
  tty.input.write('2\n')
  assert.equal(await pending, 'minor')
  assert.equal(tty.input.isRaw, false)
  assert.ok(!tty.text().includes('\u001b'))
})

test('numbered fallback accepts the fourth choice', async t => {
  const tty = terminal(t, { tty: false })
  const pending = tty.select()
  tty.input.write('4\n')
  assert.equal(await pending, 'revision')
})

test('numbered fallback rejects unavailable choices and accepts a name', async t => {
  const tty = terminal(t, { tty: false })
  const pending = tty.select({ choices: choices.map(choice => ({ ...choice, disabled: choice.value === 'minor' })) })
  tty.input.write('2\n')
  await setTimeout(0)
  tty.input.write('major\n')
  assert.equal(await pending, 'major')
  assert.match(tty.text(), /Choose an available/)
})

test('no available bumps fails before enabling raw mode', async t => {
  const tty = terminal(t)
  await assert.rejects(tty.select({ choices: choices.map(choice => ({ ...choice, disabled: true })) }), /No version bump/)
  assert.equal(tty.input.isRaw, false)
})
