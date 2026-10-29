import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { test } from 'vitest'
import { bumpVersion } from '../release-version.mjs'

const json = async path => JSON.parse(await readFile(path, 'utf8'))

async function fixture(t, { testFails = false, buildFails = false, wrongBuildVersion = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mdp-release-test-'))
  t.onTestFinished(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'scripts'))
  await mkdir(join(root, 'node_modules'))
  for (const name of ['release.mjs', 'release-version.mjs']) {
    await cp(new URL(`../${name}`, import.meta.url), join(root, 'scripts', name))
  }
  const pkg = {
    name: 'markdown-plus', version: '1.2.3', private: true,
    scripts: { test: 'node check.cjs', build: 'node build.cjs' }
  }
  const lock = {
    version: '1.2.3', lockfileVersion: 3,
    packages: { '': { version: '1.2.3' }, 'node_modules/example': { version: '1.2.3' } }
  }
  const manifest = {
    manifest_version: 3, name: 'Test', version: '1.2.3', version_name: 'old "display" name',
    permissions: ['storage'], background: { service_worker: 'worker.js' },
    content_scripts: [{ js: ['content.js'], matches: ['file:///*'] }]
  }
  for (const [name, value] of [['package.json', pkg], ['package-lock.json', lock], ['manifest.json', manifest]]) {
    await writeFile(join(root, name), `${JSON.stringify(value, null, 2)}\n`)
  }
  await writeFile(join(root, 'check.cjs'), `require('node:fs').writeFileSync('tests-ran', 'yes'); process.exit(${testFails ? 1 : 0})`)
  await writeFile(join(root, 'build.cjs'), `
    const fs = require('node:fs');
    const path = require('node:path');
    const output = process.argv[process.argv.indexOf('--outDir') + 1];
    fs.mkdirSync(output, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    ${wrongBuildVersion ? "manifest.version = '9.9.9';" : ''}
    fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(output, 'worker.js'), '// worker');
    fs.writeFileSync(path.join(output, 'content.js'), '// content');
    fs.writeFileSync(path.join(output, '.DS_Store'), 'unwanted metadata');
    process.exit(${buildFails ? 7 : 0});
  `)
  const originals = await Promise.all(['package.json', 'package-lock.json', 'manifest.json'].map(name => readFile(join(root, name), 'utf8')))
  return {
    root,
    run: (args, env = {}) => spawnSync(process.execPath, [join(root, 'scripts/release.mjs'), ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 30000
    }),
    assertSourcesUnchanged: async () => {
      const current = await Promise.all(['package.json', 'package-lock.json', 'manifest.json'].map(name => readFile(join(root, name), 'utf8')))
      assert.deepEqual(current, originals)
    },
    assertNoRelease: async () => {
      const entries = await readdir(join(root, 'releases')).catch(error => {
        if (error.code === 'ENOENT') return []
        throw error
      })
      assert.deepEqual(entries, [])
    }
  }
}

test('bump semantics reset lower components and enforce Chrome numeric limits', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4')
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0')
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0')
  assert.equal(bumpVersion('1.2.3', 'none'), '1.2.3')
  for (const version of ['0.0.0', '01.2.3', '1.2.3-beta', '1.2.3.4', '1.2.65536']) {
    assert.throws(() => bumpVersion(version, 'none'))
  }
  assert.throws(() => bumpVersion('1.2.65535', 'patch'))
  assert.throws(() => bumpVersion('1.2.3', 'invalid'))
})

test('no-bump release preserves source bytes and packages a timestamped, verifiable ZIP', async t => {
  const f = await fixture(t)
  await mkdir(join(f.root, 'dist'))
  await writeFile(join(f.root, 'dist', 'existing.txt'), 'keep development build')
  const result = f.run(['--bump', 'none'])
  assert.equal(result.status, 0, result.stdout + result.stderr)
  await f.assertSourcesUnchanged()
  assert.equal(await readFile(join(f.root, 'dist', 'existing.txt'), 'utf8'), 'keep development build')
  const [name] = await readdir(join(f.root, 'releases'))
  assert.match(name, /^markdown-plus-v1\.2\.3-\d{8}T\d{9}Z$/)
  const directory = join(f.root, 'releases', name)
  const metadata = await json(join(directory, 'release.json'))
  assert.equal(metadata.tests, 'passed')
  assert.equal(metadata.version, '1.2.3')
  assert.equal(metadata.versionName, name.replace('markdown-plus-v', ''))
  const archive = join(directory, metadata.archive)
  const extracted = spawnSync('unzip', ['-p', archive, 'manifest.json'], { encoding: 'utf8' })
  assert.equal(extracted.status, 0, extracted.stderr)
  assert.equal(JSON.parse(extracted.stdout).version_name, metadata.versionName)
  assert.equal(JSON.parse(extracted.stdout).version, '1.2.3')
  const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).stdout.trim().split('\n')
  assert.deepEqual(listing.sort(), ['content.js', 'manifest.json', 'worker.js'])
  const hash = createHash('sha256').update(await readFile(archive)).digest('hex')
  assert.equal(metadata.sha256, hash)
  assert.equal(await readFile(`${archive}.sha256`, 'utf8'), `${hash}  ${metadata.archive}\n`)
})

test('successful bump synchronizes owned versions, preserves dependencies, and refuses overwrite', async t => {
  const f = await fixture(t)
  const result = f.run(['--bump', 'minor', '--skip-tests'])
  assert.equal(result.status, 0, result.stdout + result.stderr)
  for (const name of ['package.json', 'package-lock.json', 'manifest.json']) {
    assert.equal((await json(join(f.root, name))).version, '1.3.0')
  }
  const lock = await json(join(f.root, 'package-lock.json'))
  assert.equal(lock.packages[''].version, '1.3.0')
  assert.equal(lock.packages['node_modules/example'].version, '1.2.3')
  const manifest = await json(join(f.root, 'manifest.json'))
  assert.equal(manifest.version_name, '1.3.0')
  assert.deepEqual(manifest.permissions, ['storage'])
  const directory = join(f.root, 'releases', 'markdown-plus-v1.3.0')
  assert.equal((await json(join(directory, 'release.json'))).tests, 'skipped')
  // Simulate an existing target for the next bump: no version may change.
  await mkdir(join(f.root, 'releases', 'markdown-plus-v1.3.1'))
  const conflict = f.run(['--bump', 'patch', '--skip-tests'])
  assert.equal(conflict.status, 1)
  assert.match(conflict.stderr, /already exists/)
  assert.equal((await json(join(f.root, 'package.json'))).version, '1.3.0')
})

for (const [label, settings] of [
  ['tests fail', { testFails: true }],
  ['build fails', { buildFails: true }],
  ['built version is wrong', { wrongBuildVersion: true }]
]) {
  test(`failure is transactional when ${label}`, async t => {
    const f = await fixture(t, settings)
    const result = f.run(['--bump', 'patch'])
    assert.equal(result.status, 1, result.stdout + result.stderr)
    await f.assertSourcesUnchanged()
    await f.assertNoRelease()
  })
}

test('archive verification failure restores versions and removes partial artifacts', async t => {
  const f = await fixture(t)
  const bin = join(f.root, 'bin')
  await mkdir(bin)
  await writeFile(join(bin, 'unzip'), `#!${process.execPath}\nprocess.exit(process.argv.includes('-v') ? 0 : 1)\n`, { mode: 0o755 })
  const result = f.run(['--bump', 'major'], { PATH: `${bin}:${process.env.PATH}` })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /unzip failed/)
  await f.assertSourcesUnchanged()
  await f.assertNoRelease()
})

test('SIGINT stops the build and restores source versions', async t => {
  const f = await fixture(t)
  await writeFile(join(f.root, 'build.cjs'), `
    require('node:fs').writeFileSync('build-started', 'yes');
    setTimeout(() => require('node:fs').writeFileSync('build-finished', 'unexpected'), 2000);
  `)
  const child = spawn(process.execPath, [join(f.root, 'scripts/release.mjs'), '--bump', 'major', '--skip-tests'], {
    cwd: f.root, stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  child.stdout.on('data', data => { output += data })
  child.stderr.on('data', data => { output += data })
  const closed = new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })))
  t.onTestFinished(() => { if (child.exitCode === null) child.kill('SIGTERM') })
  let started = false
  for (let attempt = 0; attempt < 100; attempt += 1) {
    started = await readFile(join(f.root, 'build-started')).then(() => true, () => false)
    if (started || child.exitCode !== null) break
    await setTimeout(20)
  }
  assert.ok(started, output)
  child.kill('SIGINT')
  assert.equal((await closed).code, 1, output)
  await f.assertSourcesUnchanged()
  await f.assertNoRelease()
  await setTimeout(2100)
  await assert.rejects(readFile(join(f.root, 'build-finished')), { code: 'ENOENT' })
})

test('rollback preserves a manual edit made during the failed build', async t => {
  const f = await fixture(t)
  await writeFile(join(f.root, 'build.cjs'), `
    const fs = require('node:fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.description = 'Concurrent manual edit';
    fs.writeFileSync('package.json', JSON.stringify(pkg));
    process.exit(1);
  `)
  const result = f.run(['--bump', 'patch', '--skip-tests'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /restore its version manually/)
  assert.equal((await json(join(f.root, 'package.json'))).description, 'Concurrent manual edit')
  assert.equal((await json(join(f.root, 'manifest.json'))).version, '1.2.3')
  assert.equal((await json(join(f.root, 'package-lock.json'))).version, '1.2.3')
  await f.assertNoRelease()
})

test('mismatched versions fail before tests, source edits, or artifacts', async t => {
  const f = await fixture(t)
  const manifest = await json(join(f.root, 'manifest.json'))
  manifest.version = '1.0.0'
  await writeFile(join(f.root, 'manifest.json'), JSON.stringify(manifest))
  const result = f.run(['--bump', 'patch'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Version mismatch/)
  assert.equal((await json(join(f.root, 'package.json'))).version, '1.2.3')
  await assert.rejects(readFile(join(f.root, 'tests-ran')), { code: 'ENOENT' })
  await f.assertNoRelease()
})

test('release lock prevents a competing writer without deleting its lock', async t => {
  const f = await fixture(t)
  await mkdir(join(f.root, 'releases', '.release.lock'), { recursive: true })
  const result = f.run(['--bump', 'minor'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Another release is running/)
  await f.assertSourcesUnchanged()
  assert.deepEqual(await readdir(join(f.root, 'releases')), ['.release.lock'])
})

test('invalid and noninteractive invocations fail without mutation; help is read-only', async t => {
  const f = await fixture(t)
  for (const args of [[], ['--bump', 'wrong'], ['--bump'], ['--unknown']]) {
    const result = f.run(args)
    assert.equal(result.status, 1)
  }
  assert.equal(f.run(['--help']).status, 0)
  await f.assertSourcesUnchanged()
  await f.assertNoRelease()
})
