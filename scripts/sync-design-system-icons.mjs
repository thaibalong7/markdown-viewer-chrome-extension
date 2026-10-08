/** Refresh standalone documentation SVG snapshots from the canonical runtime definitions. */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { APPLICATION_ICONS } from '../src/shared/icons/application-icons.js'
import { FILE_TYPE_ICONS } from '../src/shared/icons/file-type-icons.js'

const root = new URL('../', import.meta.url)
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const attributes = values => Object.entries(values).map(([name, value]) => `${name}="${escape(value)}"`).join(' ')

function svg(name, family = 'app', extra = {}) {
  const file = family === 'filetype'
  const icon = (file ? FILE_TYPE_ICONS : APPLICATION_ICONS)[name]
  if (!icon) throw new Error(`Unknown ${family} icon: ${name}`)
  const size = file ? 16 : 18
  return `<svg ${attributes({
    width: size, height: size, viewBox: `0 0 ${file ? 16 : 24} ${file ? 16 : 24}`,
    fill: 'none', stroke: file ? icon.color : 'currentColor', 'stroke-width': file ? 1.25 : 1.8,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    ...extra, style: `stroke:${file ? icon.color : 'currentColor'};stroke-width:${file ? 1.25 : 1.8}`
  })}>${icon.elements.map(([tag, attrs]) => `<${tag} ${attributes(attrs)}></${tag}>`).join('')}</svg>`
}

function gallery(catalog, family) {
  const file = family === 'filetype'
  const source = `src/shared/icons/${file ? 'file-type-icons' : 'application-icons'}.js`
  return '<div class="ds-icon-grid">\n' + Object.entries(catalog).map(([name, icon]) =>
    `<article class="ds-icon-tile" data-search="${escape(`${icon.label} ${name} ${source}`)}">${svg(name, family, { 'data-mdp-icon': name, 'data-mdp-family': family })}<strong>${escape(icon.label)}</strong><small>${file ? `16 grid · 1.25 stroke · ${icon.color}` : '24 grid · 1.8 stroke'}</small><a href="../../${source}">${name} · source</a></article>`
  ).join('\n') + '\n</div>'
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
    return svg(attrs['data-mdp-icon'], attrs['data-mdp-family'] || 'app', {
      'data-mdp-icon': attrs['data-mdp-icon'],
      ...(attrs['data-mdp-family'] ? { 'data-mdp-family': attrs['data-mdp-family'] } : {}),
      ...(attrs.class ? { class: attrs.class } : {})
    })
  })
  await writeFile(path, html)
  console.log(`Updated ${fileURLToPath(path)}`)
}
