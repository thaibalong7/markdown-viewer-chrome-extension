/** Refresh standalone documentation SVG snapshots from the canonical runtime definitions. */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { compile } from 'sass'
import { APPLICATION_ICONS } from '../src/shared/icons/application-icons.js'
import { FILE_TYPE_ICONS } from '../src/shared/icons/file-type-icons.js'

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
  return `<svg ${attributes({
    width: size, height: size, viewBox: `0 0 ${file ? 16 : 24} ${file ? 16 : 24}`,
    fill: 'none', stroke: file ? icon.color : 'currentColor', 'stroke-width': file ? 1.25 : 1.8,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    'data-mdp-icon': name, 'data-mdp-family': family,
    style: `stroke:${file ? icon.color : 'currentColor'};stroke-width:${file ? 1.25 : 1.8}`,
    ...extra
  })}>${icon.elements.map(([tag, attrs]) => `<${tag} ${attributes(attrs)}></${tag}>`).join('')}</svg>`
}

function gallery(catalog, family) {
  const file = family === 'filetype'
  const source = `src/shared/icons/${file ? 'file-type-icons' : 'application-icons'}.js`
  return `<div class="ds-icon-grid${file ? '' : ' mdp-root'}">\n` + Object.entries(catalog).map(([name, icon]) => {
    if (file) return `<article class="ds-icon-tile" data-search="${escape(`${icon.label} ${name} ${source}`)}">${svg(name, family)}<strong>${escape(icon.label)}</strong><small>16 grid · 1.25 stroke · ${icon.color}</small><a href="../../${source}">${name} · source</a></article>`
    const motion = recipes.get(`${family}/${name}`)
    if (!motion) throw new Error(`Missing motion recipe: ${family}/${name}`)
    return `<article class="ds-icon-tile" data-search="${escape(`${icon.label} ${name} ${motion.caption} ${source}`)}"><button class="ds-icon-preview" type="button" aria-label="Preview ${escape(icon.label)} animation" aria-describedby="motion-${family}-${name}">${svg(name, family)}</button><strong>${escape(icon.label)}</strong><small>24 grid · 1.8 stroke</small><p class="ds-icon-story" id="motion-${family}-${name}">${escape(motion.caption)} · ${motion.duration}</p><a href="../../${source}">${name} · source</a></article>`
  }).join('\n') + '\n</div>'
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
  await writeFile(path, html)
  console.log(`Updated ${fileURLToPath(path)}`)
}
