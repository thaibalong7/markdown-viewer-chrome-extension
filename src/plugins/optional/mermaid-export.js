const SVG_NS = 'http://www.w3.org/2000/svg'

function formatExportTimestamp(date = new Date()) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function buildExportFileName({ chartIndex, extension }) {
  const index = Number.isFinite(chartIndex) ? Math.max(1, Math.floor(chartIndex)) : 1
  const timestamp = formatExportTimestamp()
  return `mermaid-chart-${index}-${timestamp}.${extension}`
}

function parseNumericAttr(value) {
  const parsed = Number.parseFloat(String(value || ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function getSvgDimensions(svgEl) {
  const widthAttr = parseNumericAttr(svgEl.getAttribute('width'))
  const heightAttr = parseNumericAttr(svgEl.getAttribute('height'))

  if (widthAttr && heightAttr) {
    return { width: widthAttr, height: heightAttr }
  }

  const viewBox = String(svgEl.getAttribute('viewBox') || '').trim().split(/\s+/)
  if (viewBox.length === 4) {
    const vbWidth = parseNumericAttr(viewBox[2])
    const vbHeight = parseNumericAttr(viewBox[3])
    if (vbWidth && vbHeight) {
      return { width: vbWidth, height: vbHeight }
    }
  }

  const bbox = svgEl.getBoundingClientRect()
  const width = bbox.width > 0 ? bbox.width : 1024
  const height = bbox.height > 0 ? bbox.height : 768
  return { width, height }
}

function serializeSvgForExport(containerEl) {
  const svgEl = containerEl.querySelector(':scope > svg')
  if (!svgEl) {
    throw new Error('No rendered Mermaid SVG found.')
  }

  const { width, height } = getSvgDimensions(svgEl)
  const background = getComputedStyle(containerEl).backgroundColor || '#ffffff'
  const svgClone = svgEl.cloneNode(true)

  svgClone.setAttribute('xmlns', SVG_NS)
  svgClone.setAttribute('width', String(width))
  svgClone.setAttribute('height', String(height))
  if (!svgClone.getAttribute('viewBox')) {
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  const bg = document.createElementNS(SVG_NS, 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', '100%')
  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', background)
  svgClone.insertBefore(bg, svgClone.firstChild)

  const svgText = new XMLSerializer().serializeToString(svgClone)
  return { svgText, width, height }
}

export function triggerDownload({ blob, filename }) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  const mountTarget = document.body || document.documentElement
  mountTarget.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function loadImageFromSvgText(svgText) {
  const encoded = encodeURIComponent(svgText)
  const url = `data:image/svg+xml;charset=utf-8,${encoded}`
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error('Failed to load SVG image.'))
    }
    image.src = url
  })
}

export function exportMermaidSvg(containerEl, { chartIndex } = {}) {
  const { svgText } = serializeSvgForExport(containerEl)
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const filename = buildExportFileName({ chartIndex, extension: 'svg' })
  triggerDownload({ blob, filename })
}

export async function exportMermaidPng(containerEl, { chartIndex, scale = 2 } = {}) {
  const { svgText, width, height } = serializeSvgForExport(containerEl)
  const safeScale = Math.min(4, Math.max(1, Number(scale) || 1))
  const image = await loadImageFromSvgText(svgText)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * safeScale))
  canvas.height = Math.max(1, Math.round(height * safeScale))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to initialize canvas context.')
  }

  context.setTransform(safeScale, 0, 0, safeScale, 0, 0)
  context.drawImage(image, 0, 0, width, height)

  const pngBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to encode PNG image.'))
    }, 'image/png')
  })

  const filename = buildExportFileName({ chartIndex, extension: 'png' })
  triggerDownload({ blob: pngBlob, filename })
}
