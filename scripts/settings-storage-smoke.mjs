import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import WebSocket from 'ws'

// Dedicated extension and Chrome profile: never touches the installed extension's
// settings, account, or browser. CHROME_BIN can select a Chrome-for-Testing binary.
const root = fileURLToPath(new URL('../', import.meta.url))
const folder = await mkdtemp(join(tmpdir(), 'mdp-storage-smoke-'))
const extension = join(folder, 'extension'), profile = join(folder, 'profile')
await mkdir(extension)
await cp(join(root, 'src'), join(extension, 'src'), { recursive: true, filter: path => !path.includes('__tests__') })
await mkdir(join(extension, 'test/browser'), { recursive: true })
for (const name of ['settings-storage.html', 'settings-storage.js']) {
  await cp(join(root, 'test/browser', name), join(extension, 'test/browser', name))
}
await writeFile(join(extension, 'manifest.json'), JSON.stringify({
  manifest_version: 3, name: 'Markdown Plus isolated storage test', version: '1.0', permissions: ['storage']
}))
const extensionId = [...createHash('sha256').update(extension).digest('hex').slice(0, 32)]
  .map(char => String.fromCharCode(97 + parseInt(char, 16))).join('')
const executable = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

async function runBrowser(reload) {
  const child = spawn(executable, [
    '--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0',
    '--enable-unsafe-extension-debugging',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let diagnostics = ''
  child.stderr.on('data', data => { diagnostics = (diagnostics + data).slice(-4000) })
  let socket
  try {
    let endpoint
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      try {
        const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n')
        endpoint = `ws://127.0.0.1:${port}${path}`
        socket = new WebSocket(endpoint)
        await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
        break
      } catch { await pause(100) }
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error(`Chrome did not start. ${diagnostics}`)
    let nextId = 0
    const pending = new Map()
    const exceptions = []
    socket.on('message', data => {
      const response = JSON.parse(data)
      if (response.method === 'Runtime.exceptionThrown') {
        exceptions.push(response.params.exceptionDetails.exception?.description || response.params.exceptionDetails.text)
      }
      const task = pending.get(response.id)
      if (!task) return
      pending.delete(response.id)
      clearTimeout(task.timeout)
      response.error ? task.reject(new Error(JSON.stringify(response.error))) : task.resolve(response.result)
    })
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 5000)
      pending.set(id, { resolve, reject, timeout })
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
    // Branded Chrome ignores --load-extension on recent versions. CDP's explicit
    // debug-only install operates solely on this fresh disposable profile.
    const loaded = await send('Extensions.loadUnpacked', { path: extension })
    const installed = await send('Extensions.getExtensions')
    const id = loaded.id || extensionId
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Runtime.enable', {}, sessionId)
    await send('Page.enable', {}, sessionId)
    await send('Page.navigate', { url: `chrome-extension://${id}/test/browser/settings-storage.html${reload ? '?reload' : ''}` }, sessionId)
    let result
    while (Date.now() < deadline) {
      const response = await send('Runtime.evaluate', { expression: 'globalThis.storageTestResult', returnByValue: true }, sessionId)
      result = response.result?.value
      if (result) break
      await pause(100)
    }
    if (!result) {
      const page = await send('Runtime.evaluate', { expression: '({url:location.href,text:document.body?.innerText})', returnByValue: true }, sessionId)
      throw new Error(`No extension test result. ${JSON.stringify({ loaded, installed, exceptions, page: page.result?.value })}`)
    }
    console.log(JSON.stringify({ phase: reload ? 'restart' : 'storage', ...result }, null, 2))
    if (!result.ok) throw new Error(result.error)
    await send('Browser.close')
    await new Promise(resolve => child.once('exit', resolve))
    return result
  } finally {
    socket?.terminate()
    if (child.exitCode === null) child.kill()
    child.stderr.destroy()
    child.unref()
  }
}

try {
  await runBrowser(false)
  await runBrowser(true)
  console.log(`Isolated profile and extension retained for inspection: ${folder}`)
} catch (error) {
  console.error(error)
  console.error(`Isolated artifacts: ${folder}`)
  process.exitCode = 1
}
