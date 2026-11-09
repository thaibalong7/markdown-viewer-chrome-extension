// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { getCurrentMatchRects } from '../current-match-geometry.js'

afterEach(() => document.body.replaceChildren())
function target(rectangles) {
  const text = document.createTextNode('needle')
  document.body.append(text)
  return { startContainer: text, getClientRects: () => rectangles }
}
const scrollRoot = { getBoundingClientRect: () => ({ left: 10, top: 20, right: 210, bottom: 120 }) }

it('merges adjacent syntax spans on a line, keeps wrapped lines separate and clips invisible hits', () => {
  const range = target([
    { left: 15, right: 35, top: 30, bottom: 50 },
    { left: 35, right: 60, top: 30, bottom: 50 },
    { left: 15, right: 80, top: 60, bottom: 80 },
    { left: 15, right: 80, top: 150, bottom: 170 }
  ])
  expect(getCurrentMatchRects(range, scrollRoot)).toEqual([
    { left: 15, top: 30, width: 45, height: 20 }, { left: 15, top: 60, width: 65, height: 20 }
  ])
})

it('drops detached ranges and clamps boxes at the scroll viewport edges', () => {
  const range = target([{ left: -10, right: 80, top: 10, bottom: 40 }])
  expect(getCurrentMatchRects(range, scrollRoot)).toEqual([{ left: 10, top: 20, width: 70, height: 20 }])
  range.startContainer.remove()
  expect(getCurrentMatchRects(range, scrollRoot)).toEqual([])
})
