/**
 * Basic `.gitignore` matching (nested sections, no `!` un-ignore).
 * Supports `*`, `?`, `**`, leading `/` (anchored to the `.gitignore` directory), trailing `/` (directory-only).
 */

/**
 * @param {string} dirRelFromScanRoot - posix path to folder containing `.gitignore`, no leading slash; '' = scan root
 * @returns {string} normalized anchor ending with `/` or ''
 */
export function normalizeGitignoreAnchor(dirRelFromScanRoot) {
  const s = String(dirRelFromScanRoot || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
  return s ? `${s}/` : ''
}

/**
 * @param {string} globPat - pattern without leading `/` (caller strips)
 * @param {boolean} anchored - pattern had leading `/`
 */
function globPatternToRegex(globPat, anchored) {
  const hasSlash = globPat.includes('/')
  const body = globToRegexBody(globPat)
  if (anchored) {
    return new RegExp(`^${body}(?:/.*)?$`, 'i')
  }
  if (!hasSlash) {
    return new RegExp(`^(?:.*/)?${body}(?:/.*)?$`, 'i')
  }
  return new RegExp(`^${body}(?:/.*)?$`, 'i')
}

function globToRegexBody(glob) {
  const chunks = String(glob).split('**')
  const parts = []
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) parts.push('.*')
    const c = chunks[i]
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
    parts.push(c)
  }
  return parts.join('')
}

/**
 * @param {string} text - raw `.gitignore` body
 * @returns {Array<{ re: RegExp, dirOnly: boolean }>}
 */
export function parseGitignoreRules(text) {
  /** @type {Array<{ re: RegExp, dirOnly: boolean }>} */
  const rules = []
  const lines = String(text || '').split(/\r?\n/)
  for (let raw of lines) {
    raw = raw.trim()
    if (!raw || raw.startsWith('#')) continue
    if (raw.startsWith('!')) continue
    const dirOnly = raw.endsWith('/')
    let pat = dirOnly ? raw.slice(0, -1).trimEnd() : raw
    if (!pat) continue
    let anchored = false
    if (pat.startsWith('/')) {
      anchored = true
      pat = pat.slice(1)
    }
    if (!pat) continue
    try {
      rules.push({ re: globPatternToRegex(pat, anchored), dirOnly })
    } catch {
      /* skip malformed */
    }
  }
  return rules
}

/**
 * @param {{ re: RegExp, dirOnly: boolean }} rule
 * @param {string} relToSection - path relative to section anchor (posix, no leading slash)
 * @param {boolean} isDir - whether `relToSection` refers to a directory entry
 */
function ruleMatchesPath(rule, relToSection, isDir) {
  const rel = relToSection
  if (!rule.dirOnly) {
    return rule.re.test(rel)
  }
  if (rule.re.test(rel)) {
    if (isDir) return true
    return rel.includes('/')
  }
  return false
}

export function createGitignoreMatcher() {
  /** @type {Array<{ anchor: string, rules: Array<{ re: RegExp, dirOnly: boolean }> }>} */
  const sections = []

  return {
    /**
     * @param {string} dirRelFromScanRoot
     * @param {string} fileText
     */
    addSection(dirRelFromScanRoot, fileText) {
      const rules = parseGitignoreRules(fileText)
      if (!rules.length) return
      sections.push({ anchor: normalizeGitignoreAnchor(dirRelFromScanRoot), rules })
    },

    /**
     * @param {string} relPathFromScanRoot - posix, no leading slash
     * @param {boolean} isDir
     */
    shouldIgnore(relPathFromScanRoot, isDir) {
      const rel = String(relPathFromScanRoot || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
      if (!rel) return false

      for (const { anchor, rules } of sections) {
        let relToSection = rel
        if (anchor) {
          const anchorNoSlash = anchor.slice(0, -1)
          if (rel === anchorNoSlash) {
            relToSection = ''
          } else if (rel.startsWith(anchor)) {
            relToSection = rel.slice(anchor.length)
          } else {
            continue
          }
        }

        for (const rule of rules) {
          if (ruleMatchesPath(rule, relToSection, isDir)) return true
        }
      }
      return false
    }
  }
}

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @returns {boolean}
 */
export function explorerSubtreeHasMarkdownFile(node) {
  if (!node) return false
  if (node.type === 'file') return true
  for (const c of node.children || []) {
    if (explorerSubtreeHasMarkdownFile(c)) return true
  }
  return false
}

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @param {boolean} [isScanRoot] - keep node even when empty (workspace / folder scan root)
 * @returns {boolean}
 */
export function pruneExplorerFoldersWithoutMarkdown(node, isScanRoot = false) {
  if (!node) return false
  if (node.type === 'file') return true
  const kids = node.children || []
  /** @type {typeof kids} */
  const next = []
  for (const c of kids) {
    if (c.type === 'folder') {
      if (pruneExplorerFoldersWithoutMarkdown(c, false)) next.push(c)
    } else {
      next.push(c)
    }
  }
  node.children = next
  if (isScanRoot) return true
  return next.length > 0
}
