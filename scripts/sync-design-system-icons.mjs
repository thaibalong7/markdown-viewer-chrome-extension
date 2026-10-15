/** Refresh standalone documentation SVG snapshots from the canonical runtime definitions. */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { compile } from 'sass'
import { APPLICATION_ICONS } from '../src/shared/icons/application-icons.js'
import { FILE_TYPE_ICONS } from '../src/shared/icons/file-type-icons.js'
import { FILE_TYPE_COLORS, getFileTypeIconStyleVars } from '../src/shared/icons/file-type-colors.js'

const root = new URL('../', import.meta.url)
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const attributes = values => Object.entries(values).map(([name, value]) => `${name}="${escape(value)}"`).join(' ')
const motionCss = compile(fileURLToPath(new URL('src/viewer/styles/_icon-motion.scss', root))).css
const recipes = new Map([...motionCss.matchAll(/svg\[data-mdp-family=([^\]]+)\]\[data-mdp-icon=([^\]]+)\]\s*\{([^}]+)\}/g)].map(([, family, name, body]) => {
  const caption = body.match(/--mdp-icon-motion-label: (["'])([^\n]+)\1;/)?.[2]
  const duration = body.match(/--mdp-icon-motion-duration: (\d+ms);/)?.[1]
  if (!caption || !duration) throw new Error(`Incomplete motion recipe: ${family}/${name}`)
  return [`${family}/${name}`, { caption, duration }]
}))

function svg(name, family = 'app', extra = {}) {
  const file = family === 'filetype'
  const icon = (file ? FILE_TYPE_ICONS : APPLICATION_ICONS)[name]
  if (!icon) throw new Error(`Unknown ${family} icon: ${name}`)
  const size = file ? 16 : 18
  const color = file && icon.colorToken ? `var(${icon.colorToken}, ${icon.color})` : icon.color
  return `<svg ${attributes({
    width: size, height: size, viewBox: `0 0 ${file ? 16 : 24} ${file ? 16 : 24}`,
    fill: 'none', stroke: file ? icon.color : 'currentColor', 'stroke-width': file ? 1.25 : 1.8,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    'data-mdp-icon': name, 'data-mdp-family': family,
    style: `stroke:${file ? icon.color : 'currentColor'};stroke-width:${file ? 1.25 : 1.8}`,
    ...extra,
    // Identity snapshots must not preserve their previous fixed paint values.
    ...(file ? { stroke: color, 'stroke-width': 1.25,
      style: `color:${color};stroke:${color};stroke-width:1.25` } : {})
  })}>${icon.elements.map(([tag, attrs]) => `<${tag} ${attributes(attrs)}></${tag}>`).join('')}</svg>`
}

function gallery(catalog, family) {
  const file = family === 'filetype'
  const source = `src/shared/icons/${file ? 'file-type-icons' : 'application-icons'}.js`
  return `<div class="ds-icon-grid${file ? '' : ' mdp-root'}">\n` + Object.entries(catalog).map(([name, icon]) => {
    if (file) {
      const shades = FILE_TYPE_COLORS[name]
      return `<article class="ds-icon-tile" data-search="${escape(`${icon.label} ${name} ${source}`)}">${svg(name, family)}<strong>${escape(icon.label)}</strong><small>16 grid · 1.25 stroke · ${shades ? `${shades.light} / ${shades.dark}` : icon.color}</small><a href="../../${source}">${name} · source</a></article>`
    }
    const motion = recipes.get(`${family}/${name}`)
    if (!motion) throw new Error(`Missing motion recipe: ${family}/${name}`)
    return `<article class="ds-icon-tile" data-search="${escape(`${icon.label} ${name} ${motion.caption} ${source}`)}"><button class="ds-icon-preview" type="button" aria-label="Preview ${escape(icon.label)} animation" aria-describedby="motion-${family}-${name}">${svg(name, family)}</button><strong>${escape(icon.label)}</strong><small>24 grid · 1.8 stroke</small><p class="ds-icon-story" id="motion-${family}-${name}">${escape(motion.caption)} · ${motion.duration}</p><a href="../../${source}">${name} · source</a></article>`
  }).join('\n') + '\n</div>'
}

function fileRows() {
  const files = [
    ['vector', 'app-erd-listing.svg'], ['markdown', 'tod-erd-example.md'],
    ['schema', 'tod-erd.dbml'], ['vector', 'tod-landscape.svg'], ['vector', 'tod-pipeline-flow.svg'],
    ['markdown', 'architecture.md'], ['markdown', 'shared-app-db.md'],
    ['database', 'schema.sql'], ['diagram', 'flow.mermaid'], ['image', 'cover.png'], ['text', 'notes.txt']
  ]
  return `<div class="ds-file-previews">${['light', 'dark'].map(theme => {
    const vars = Object.entries(getFileTypeIconStyleVars(theme)).map(([key, value]) => `${key}:${value}`).join(';')
    return `<section class="ds-file-preview" data-preview-theme="${theme}" style="${vars}" aria-label="${theme} file identities"><h3>Files <span>${theme === 'light' ? 'Light' : 'Dark'}</span></h3><div class="ds-file-folder">${svg('folder-open', 'filetype')}<strong>technical-specs / assets</strong></div>${files.map(([name, filename]) => `<button class="ds-file-row${name === 'schema' ? ' is-selected' : ''}" type="button" aria-pressed="${name === 'schema'}" title="${filename} — ${FILE_TYPE_ICONS[name].label}">${svg(name, 'filetype')}<span>${filename}</span></button>`).join('')}</section>`
  }).join('')}</div><p class="ds-file-note">Native 16px artwork · distinct shapes and hues · click or focus a row to compare selection. Appearance fixture only; it does not open files.</p>`
}

const fileColorCss = `:root {${Object.entries(getFileTypeIconStyleVars()).map(([key, value]) => `${key}:${value}`).join(';')}}\n[data-theme="dark"], .dark {${Object.entries(getFileTypeIconStyleVars('dark')).map(([key, value]) => `${key}:${value}`).join(';')}}`
function syncFileColorStyles(html) {
  const block = `<style id="runtime-file-icon-colors">\n/* Generated from src/shared/icons/file-type-colors.js. */\n${fileColorCss}\n</style>`
  return html.includes('id="runtime-file-icon-colors"')
    ? html.replace(/<style id="runtime-file-icon-colors">[\s\S]*?<\/style>/, () => block)
    : html.replace('</head>', `${block}\n</head>`)
}

for (const name of ['index', 'components', 'icons', 'viewer']) {
  const path = new URL(`docs/design-system/${name}.html`, root)
  let html = await readFile(path, 'utf8')
  if (name === 'icons') {
    for (const [family, catalog] of [['app', APPLICATION_ICONS], ['filetype', FILE_TYPE_ICONS]]) {
      const start = `<!-- BEGIN ${family} ICON GALLERY -->`
      const end = `<!-- END ${family} ICON GALLERY -->`
      if (!html.includes(start) || !html.includes(end)) throw new Error(`Missing ${family} gallery markers`)
      html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => `${start}\n${gallery(catalog, family)}\n${end}`)
    }
    html = html.replace(/<!-- BEGIN filetype ROW PREVIEW -->[\s\S]*?<!-- END filetype ROW PREVIEW -->/,
      () => `<!-- BEGIN filetype ROW PREVIEW -->\n${fileRows()}\n<!-- END filetype ROW PREVIEW -->`)
  }
  html = html.replace(/<svg\b([^>]*\bdata-mdp-icon="[^"]+"[^>]*)>[\s\S]*?<\/svg>/g, (_, rawAttributes) => {
    const attrs = Object.fromEntries([...rawAttributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]))
    return svg(attrs['data-mdp-icon'], attrs['data-mdp-family'] || 'app', attrs)
  })
  html = html.replace(/<span\b(?=[^>]*class="[^"]*\bmdp-icon-swap\b)([^>]*)>(<svg\b[^>]*>[\s\S]*?<\/svg>)(<svg\b[^>]*>[\s\S]*?<\/svg>)<\/span>/g, (_, attrs, first, second) => {
    const swapped = /data-swapped="true"/.test(attrs)
    const visible = (glyph, value) => glyph.replace(/ data-icon-visible="[^"]*"/g, '').replace('<svg ', `<svg data-icon-visible="${value}" `)
    return `<span${attrs}>${visible(first, !swapped)}${visible(second, swapped)}</span>`
  })
  const motionSnapshot = `<style id="runtime-icon-motion-styles">\n/* Compiled from src/viewer/styles/_icon-motion.scss, including icon-recipes/. */\n${motionCss}\n</style>`
  if (html.includes('id="runtime-icon-motion-styles"')) {
    html = html.replace(/<style id="runtime-icon-motion-styles">[\s\S]*?<\/style>/, () => motionSnapshot)
  }
  await writeFile(path, syncFileColorStyles(html))
  console.log(`Updated ${fileURLToPath(path)}`)
}

// The Files tree specimen keeps offline data, not separate icon artwork.
const treePath = new URL('docs/design-system/folder-tree.html', root)
const treeHtml = await readFile(treePath, 'utf8')
if (!/const FILE_ICONS = [^\n]+;/.test(treeHtml)) throw new Error('Missing Files tree icon data')
await writeFile(treePath, syncFileColorStyles(treeHtml.replace(/const FILE_ICONS = [^\n]+;/,
  () => `const FILE_ICONS = ${JSON.stringify(FILE_TYPE_ICONS)};`)))
console.log(`Updated ${fileURLToPath(treePath)}`)
