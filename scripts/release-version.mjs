import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const BUMP_TYPES = ['patch', 'minor', 'major', 'none']

export function validateVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Expected a major.minor.patch version, received: ${version}`)
  }
  const parts = version.split('.').map(Number)
  if (parts.some(part => part > 65535) || parts.every(part => part === 0)) {
    throw new Error(`Version is outside Chrome's supported numeric range: ${version}`)
  }
  return parts
}

export function bumpVersion(version, bump) {
  const parts = validateVersion(version)
  if (!BUMP_TYPES.includes(bump)) throw new Error(`Unknown bump type: ${bump}`)
  if (bump === 'none') return version
  const index = { major: 0, minor: 1, patch: 2 }[bump]
  parts[index] += 1
  parts.fill(0, index + 1)
  const next = parts.join('.')
  validateVersion(next)
  return next
}

export async function readVersions(root) {
  const files = await Promise.all(['package.json', 'package-lock.json', 'manifest.json'].map(async name => {
    const path = join(root, name)
    const original = await readFile(path, 'utf8')
    return { path, name, original, data: JSON.parse(original) }
  }))
  const [pkg, lock, manifest] = files.map(file => file.data)
  validateVersion(pkg.version)
  if ([lock.version, lock.packages?.['']?.version, manifest.version].some(version => version !== pkg.version)) {
    throw new Error('Version mismatch: package.json, package-lock.json (including packages[""]), and manifest.json must agree.')
  }
  return { files, version: pkg.version, name: pkg.name }
}

export function versionEdits(files, version) {
  return files.map(file => {
    let updated
    if (file.name === 'manifest.json') {
      // Preserve compact manifest arrays and every field unrelated to the release.
      updated = file.original.replace(/("version"\s*:\s*")[^"]+("\s*[,}])/, (_, before, after) => `${before}${version}${after}`)
      updated = updated.replace(/("version_name"\s*:\s*)"(?:[^"\\]|\\.)*"/, (_, before) => `${before}${JSON.stringify(version)}`)
    } else {
      const data = structuredClone(file.data)
      data.version = version
      if (file.name === 'package-lock.json') data.packages[''].version = version
      updated = `${JSON.stringify(data, null, 2)}\n`
    }
    return { ...file, updated }
  })
}

export async function writeVersions(edits) {
  for (const file of edits) {
    if (await readFile(file.path, 'utf8') !== file.original) {
      throw new Error(`${file.name} changed during the release; retry after the edit is finished.`)
    }
  }
  for (const file of edits) await writeFile(file.path, file.updated)
}

export async function restoreVersions(edits) {
  const failures = []
  for (const file of edits) {
    try {
      const current = await readFile(file.path, 'utf8')
      if (current === file.original) continue
      if (current !== file.updated) throw new Error('file was edited during the release; restore its version manually')
      await writeFile(file.path, file.original)
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`)
    }
  }
  if (failures.length) throw new Error(`Could not fully restore versions:\n${failures.join('\n')}`)
}
