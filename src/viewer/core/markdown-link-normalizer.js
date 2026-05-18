function isLikelyLocalLinkHref(href) {
  const value = String(href || '').trim()
  if (!value || !value.includes(' ')) return false
  if (value.startsWith('<') || value.startsWith('#')) return false
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return false
  return true
}

function looksLikeMarkdownLinkTitle(value) {
  if (!value) return false
  const trimmed = String(value).trim()
  if (trimmed.length < 2) return false
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return true
  }
  return trimmed.startsWith('(') && trimmed.endsWith(')')
}

function encodeLocalLinkSpaces(linkContent) {
  const value = String(linkContent || '')
  if (!isLikelyLocalLinkHref(value)) return value

  let hrefPart = value
  let titlePart = ''
  for (let i = value.length - 1; i >= 0; i -= 1) {
    if (!/\s/.test(value[i])) continue
    const suffix = value.slice(i).trimStart()
    if (!looksLikeMarkdownLinkTitle(suffix)) continue
    hrefPart = value.slice(0, i)
    titlePart = value.slice(i)
    break
  }

  if (!isLikelyLocalLinkHref(hrefPart)) return value
  return `${hrefPart.replace(/ /g, '%20')}${titlePart}`
}

export function normalizeLocalMarkdownLinkDestinations(markdown) {
  const source = String(markdown || '')
  const lines = source.split('\n')
  let inFence = false
  let fenceMarker = ''

  return lines
    .map((line) => {
      const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/)
      if (fenceMatch) {
        const marker = fenceMatch[1]
        if (!inFence) {
          inFence = true
          fenceMarker = marker[0]
        } else if (marker[0] === fenceMarker) {
          inFence = false
          fenceMarker = ''
        }
        return line
      }
      if (inFence) return line

      let output = ''
      let codeSpanTicks = 0
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '`') {
          let tickRunLength = 1
          while (line[i + tickRunLength] === '`') tickRunLength += 1
          const tickRun = line.slice(i, i + tickRunLength)
          output += tickRun
          if (codeSpanTicks === 0) codeSpanTicks = tickRunLength
          else if (codeSpanTicks === tickRunLength) codeSpanTicks = 0
          i += tickRunLength - 1
          continue
        }
        if (codeSpanTicks > 0 || char !== ']' || line[i + 1] !== '(') {
          output += char
          continue
        }

        let cursor = i + 2
        let depth = 1
        while (cursor < line.length) {
          const current = line[cursor]
          if (current === '\\') {
            cursor += 2
            continue
          }
          if (current === '(') depth += 1
          else if (current === ')') {
            depth -= 1
            if (depth === 0) break
          }
          cursor += 1
        }
        if (depth !== 0) {
          output += char
          continue
        }

        const linkContent = line.slice(i + 2, cursor)
        output += `](${encodeLocalLinkSpaces(linkContent)})`
        i = cursor
      }
      return output
    })
    .join('\n')
}
