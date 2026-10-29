import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { BUMP_TYPES, bumpVersion, packageVersionFor, readVersions, restoreVersions, versionEdits, writeVersions } from './release-version.mjs'
import { selectBump } from './release-prompt.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
// Terminal-only styling; keep redirected logs and NO_COLOR output plain.
const paint = (code, value, stream = process.stdout) =>
  stream.isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb'
    ? `\u001b[${code}m${value}\u001b[0m`
    : String(value)
const step = message => console.log(`\n${paint('1;36', message)}`)
const warn = message => console.warn(paint('33', message, process.stderr))
const bumpColors = { patch: '32', minor: '36', major: '35', revision: '34' }
const help = `Usage: npm run release -- [--bump patch|minor|major|revision|none] [--skip-tests]

Without --bump, ask whether to bump the version and which component to bump.
--bump revision  Increment the fourth numeric component (e.g. 0.1.0 -> 0.1.0.1).
--bump none    Keep source versions; timestamp the ZIP and packaged version_name.
--skip-tests   Explicitly skip npm test (recorded in release.json).

Requires the Node version in .nvmrc, installed dependencies, zip, and unzip.
Output: releases/<build-name>/ (unpacked extension, ZIP, checksum, release.json).
Successful bumps update package.json, package-lock.json, and manifest.json.
No commit, tag, push, or upload is performed.`

function parseArgs(args) {
  const options = { bump: null, skipTests: false }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') return { help: true }
    if (arg === '--skip-tests') options.skipTests = true
    else if (arg === '--bump' && options.bump === null && BUMP_TYPES.includes(args[i + 1])) options.bump = args[++i]
    else throw new Error(`Invalid argument: ${arg}\n${help}`)
  }
  return options
}

async function chooseBump(version) {
  if (!process.stdin.isTTY) throw new Error('Interactive input requires a terminal. Use --bump patch|minor|major|revision|none.')
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    console.log(`\n${paint('1;36', 'Markdown Plus · Release')}`)
    let answer
    do {
      answer = (await prompt.question(`Current version: ${paint('1', version)}. ${paint('1;36', 'Bump version?')} ${paint('2', '[y/N]')} `)).trim().toLowerCase()
    } while (!['', 'y', 'yes', 'n', 'no'].includes(answer))
    if (!['y', 'yes'].includes(answer)) return 'none'
  } finally {
    prompt.close()
  }
  console.log(`\n${paint('1', 'Choose a version bump')} ${paint('2', '(major.minor.patch[.revision])')}`)
  const choices = [
    ['patch', 'Bug fixes and small corrections'],
    ['minor', 'New features that keep existing usage compatible'],
    ['major', 'Breaking changes that require users to adjust or migrate'],
    ['revision', 'A small follow-up release; increment only the fourth number']
  ].map(([value, description]) => {
    try {
      return { value, description, next: `${version} -> ${bumpVersion(version, value)}` }
    } catch {
      return { value, description, next: 'unavailable (Chrome version limit)', disabled: true }
    }
  })
  return selectBump({ choices, paint, colors: bumpColors })
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function preflight() {
  for (const [command, args] of [['zip', ['-v']], ['unzip', ['-v']]]) {
    const result = spawnSync(command, args, { stdio: 'ignore' })
    if (result.error || result.status !== 0) throw new Error(`Install ${command} before building a release.`)
  }
}

function gitState() {
  const read = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
    return result.status === 0 ? result.stdout.trim() : null
  }
  const status = read(['status', '--porcelain'])
  return { commit: read(['rev-parse', 'HEAD']), dirty: status === null ? null : status.length > 0 }
}

async function validateBuild(directory, version) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
  if (manifest.manifest_version !== 3 || manifest.version !== version) {
    throw new Error('Built manifest has an unexpected manifest_version or release version.')
  }
  const entries = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_page,
    ...Object.values(manifest.icons || {}),
    ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])]),
    manifest.default_locale && `_locales/${manifest.default_locale}/messages.json`
  ].filter(Boolean)
  for (const entry of entries) {
    if (!await exists(join(directory, entry))) throw new Error(`Built extension is missing: ${entry}`)
  }
  return manifest
}

async function release(options) {
  const sources = await readVersions(root)
  const bump = options.bump ?? await chooseBump(sources.version)
  const version = bumpVersion(sources.version, bump)
  const builtAt = new Date().toISOString()
  const timestamp = builtAt.replace(/[-:]/g, '').replace('.', '')
  const versionName = bump === 'none' ? `${version}-${timestamp}` : version
  const buildName = `${sources.name}-v${versionName}`
  if (!/^[a-zA-Z0-9._-]+$/.test(buildName)) throw new Error('Package name cannot be used as a release filename.')
  const releases = join(root, 'releases')
  const destination = join(releases, buildName)
  const lock = join(releases, '.release.lock')
  preflight()
  if (!await exists(join(root, 'node_modules'))) throw new Error('Install dependencies with npm ci first.')
  await mkdir(releases, { recursive: true })
  try {
    await mkdir(lock)
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another release is running (.release.lock exists). See docs/releasing.md for recovery.')
    throw error
  }

  let stage
  let edits = []
  let complete = false
  let child
  let interrupted = false
  const useProcessGroup = process.platform !== 'win32'
  const interrupt = signal => {
    interrupted = true
    if (!child) return
    // npm launches a shell/build process; stop the whole group before rollback.
    try {
      if (useProcessGroup) process.kill(-child.pid, signal)
      else child.kill(signal)
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
  const onInterrupt = () => interrupt('SIGINT')
  const onTerminate = () => interrupt('SIGTERM')
  process.on('SIGINT', onInterrupt)
  process.on('SIGTERM', onTerminate)
  const checkInterrupted = () => {
    if (interrupted) throw new Error('Release interrupted.')
  }
  const run = (command, args, cwd = root) => new Promise((resolve, reject) => {
    checkInterrupted()
    child = spawn(command, args, {
      cwd, stdio: 'inherit', detached: useProcessGroup, env: { ...process.env, ANALYZE: '0' }
    })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      child = null
      if (code === 0 && !interrupted) resolve()
      else reject(new Error(`${command} failed (${signal || code}).`))
    })
  })
  const npm = args => process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args])
    : run('npm', args)

  try {
    if (await exists(destination)) throw new Error(`Release already exists: ${destination}`)
    const git = gitState()
    step(`Release: ${sources.version} -> ${versionName} (${bump})`)
    if (packageVersionFor(version) !== version) console.log(`npm package version: ${packageVersionFor(version)}`)
    if (git.dirty) warn('Working tree has local changes; they will be included and recorded in release.json.')
    step('[1/4] Run tests')
    if (options.skipTests) warn('Skipping tests because --skip-tests was supplied.')
    else await npm(['test'])
    checkInterrupted()
    stage = await mkdtemp(join(releases, '.building-'))
    if (bump !== 'none') {
      edits = versionEdits(sources.files, version)
      await writeVersions(edits)
    }
    const extension = join(stage, 'extension')
    step('[2/4] Build production extension')
    await npm(['run', 'build', '--', '--outDir', extension])
    const manifest = await validateBuild(extension, version)
    manifest.version_name = versionName
    await writeFile(join(extension, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const filename = `${buildName}.zip`
    const archive = join(stage, filename)
    step('[3/4] Create ZIP and verify integrity')
    await run('zip', ['-q', '-r', '-X', archive, '.', '-x', '*.DS_Store', '__MACOSX/*'], extension)
    await run('unzip', ['-tq', archive])
    const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex')
    await writeFile(join(stage, `${filename}.sha256`), `${sha256}  ${filename}\n`)
    await writeFile(join(stage, 'release.json'), `${JSON.stringify({
      version, packageVersion: packageVersionFor(version), versionName, bump, builtAt, git,
      tests: options.skipTests ? 'skipped' : 'passed', archive: filename, sha256
    }, null, 2)}\n`)
    checkInterrupted()
    // Publish only a complete bundle. The lock prevents competing release writers.
    await rename(stage, destination)
    complete = true
    console.log(`\n${paint('1;32', '[4/4] Release ready')}\n${destination}`)
    console.log(`${paint('1', 'ZIP:')} ${join(destination, filename)}\n${paint('1', 'Load unpacked:')} ${join(destination, 'extension')}`)
    if (bump === 'none') warn('Same-version builds are for testing; publishing an update requires a higher numeric version.')
  } finally {
    try {
      if (!complete) await restoreVersions(edits)
    } finally {
      if (stage && !complete) await rm(stage, { recursive: true, force: true })
      await rm(lock, { recursive: true, force: true })
      process.off('SIGINT', onInterrupt)
      process.off('SIGTERM', onTerminate)
    }
  }
}

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) console.log(help)
  else await release(options)
} catch (error) {
  console.error(paint('1;31', `Release failed: ${error.message}`, process.stderr))
  process.exitCode = 1
}
