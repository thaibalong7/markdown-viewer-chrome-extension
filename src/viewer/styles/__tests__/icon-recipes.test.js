import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { APPLICATION_ICONS } from '../../../shared/icons/application-icons.js'
import { FILE_TYPE_ICONS } from '../../../shared/icons/file-type-icons.js'

const css = compile(fileURLToPath(new URL('../_icon-motion.scss', import.meta.url))).css
const recipes = new Map([...css.matchAll(/svg\[data-mdp-family=([^\]]+)\]\[data-mdp-icon=([^\]]+)\]\s*\{([^}]+)\}/g)]
  .map(([, family, name, body]) => [`${family}/${name}`, body]))
const bindings = [...css.matchAll(/svg\[data-mdp-family=([^\]]+)\]\[data-mdp-icon=([^\]]+)\] > \[data-icon-part=([^\]]+)\]\s*\{([^}]+)\}/g)]
  .map(([, family, name, part, body]) => ({ key: `${family}/${name}`, part, body }))
const icons = Object.entries(APPLICATION_ICONS).map(([name, definition]) => [`app/${name}`, definition])

// Read balanced blocks so distinctness compares actual motion, not keyframe names.
function keyframes(name) {
  const start = css.indexOf(`@keyframes ${name} {`)
  if (start < 0) throw new Error(`Missing keyframes: ${name}`)
  const open = css.indexOf('{', start)
  let depth = 1
  let end = open + 1
  for (; depth && end < css.length; end++) {
    if (css[end] === '{') depth++
    if (css[end] === '}') depth--
  }
  return css.slice(open + 1, end - 1).replace(/\s+/g, ' ').trim()
}

describe('Per-icon Viewer choreography', () => {
  it.each(icons)('%s has a recipe whose animated parts exist in the canonical glyph', (key, definition) => {
    const recipe = recipes.get(key)
    expect(recipe).toContain('--mdp-icon-motion-label:')
    expect(recipe).toContain('--mdp-icon-press-pose:')
    const duration = Number(recipe.match(/--mdp-icon-motion-duration: (\d+)ms;/)[1])
    const parts = bindings.filter(binding => binding.key === key)
    expect(parts.length).toBeGreaterThan(0)
    for (const binding of parts) {
      const shape = definition.elements.find(([, attrs]) => attrs['data-icon-part'] === binding.part)
      expect(shape, binding.part).toBeDefined()
      expect(shape[1]['data-icon-local-motion']).toBeUndefined()
      expect(shape[1].pathLength).toBe('1')
      const animation = binding.body.match(/--mdp-icon-part-animation: ([\w-]+);/)[1]
      expect(keyframes(animation)).toContain('100%')
      const delay = Number(binding.body.match(/--mdp-icon-part-delay: (\d+)ms;/)[1])
      expect(duration + delay).toBeLessThanOrEqual(1000)
    }
  })

  it('covers the application icon catalog and gives every glyph a distinct timeline', () => {
    expect([...recipes.keys()].sort()).toEqual(icons.map(([key]) => key).sort())
    const fingerprints = icons.map(([key]) => bindings.filter(binding => binding.key === key).map(binding => {
      const animation = binding.body.match(/--mdp-icon-part-animation: ([\w-]+);/)[1]
      return keyframes(animation) + binding.body.replace(/--mdp-icon-part-animation: [\w-]+;/, '')
    }).sort().join('|').replace(/\s+/g, ' '))
    expect(new Set(fingerprints).size).toBe(icons.length)
  })

  it('keeps Explorer file and folder identities static and outside motion selectors', () => {
    expect(css).not.toContain('data-mdp-family=filetype')
    expect(css).not.toContain('mdp-file-')
    expect(css).toContain('svg[data-mdp-icon][data-mdp-family=app]:not([data-icon-visible=false])')
    for (const definition of Object.values(FILE_TYPE_ICONS)) {
      for (const [, attrs] of definition.elements) {
        expect(attrs['data-icon-part']).toBeUndefined()
        expect(attrs.pathLength).toBeUndefined()
      }
    }
  })

  it('protects expanded disclosure orientation, hidden swaps and actual busy animations', () => {
    expect(css).toContain(':not([data-icon-visible=false]) > [data-icon-part]:not([data-icon-local-motion])')
    expect(css).toContain(':not(:disabled, [aria-disabled=true], [aria-busy=true])')
    // The frame and metadata must stay outside decorative animation bindings.
    expect(bindings.filter(binding => binding.key === 'app/file-details').map(binding => binding.part)).toEqual(['chevron'])
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('[data-icon-part]:not([data-icon-local-motion])')
    expect(reduced).toContain('animation: none !important;')
    expect(reduced).toContain('stroke-dasharray: none;')
    expect(reduced).toContain('stroke-dashoffset: 0;')
    expect(css).toContain('animation-iteration-count: 1;')
    expect(css).not.toContain('infinite')
  })
})
