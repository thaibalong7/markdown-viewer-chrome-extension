import { expect, it } from 'vitest'
import { reviewPairChanged, reviewPairReducer } from '../review-pair.js'

it('pins both sources until an explicit refresh, including apply, repeated polling and disk reversion', () => {
  const first = { generation: 1, id: '1:pending:1', before: 'accepted', after: 'first', kind: 'pending' }
  const pair = reviewPairReducer(null, { type: 'open', candidate: first })
  const latest = { ...first, id: '1:pending:2', after: 'second' }
  expect(reviewPairReducer(pair, { type: 'sync', available: true, generation: 1, candidate: latest })).toBe(pair)
  expect(reviewPairChanged(pair, latest, 'accepted')).toBe(true)
  expect(pair.after).toBe('first')
  expect(reviewPairChanged(pair, { ...first, kind: 'applied', id: '1:0:1' }, 'first')).toBe(false)
  expect(reviewPairChanged(pair, null, 'accepted')).toBe(true)
  const refreshed = reviewPairReducer(pair, { type: 'refresh', candidate: latest })
  expect(refreshed.after).toBe('second')
  expect(pair.after).toBe('first')
  expect(reviewPairReducer(refreshed, { type: 'close' })).toBeNull()
})

it('drops a pinned pair on navigation, reopening the same URL, or unavailable documents', () => {
  const pair = { generation: 1, before: 'old', after: 'new' }
  expect(reviewPairReducer(pair, { type: 'sync', available: true, generation: 2 })).toBeNull()
  expect(reviewPairReducer(pair, { type: 'sync', available: false, generation: 1 })).toBeNull()
  expect(reviewPairReducer(pair, { type: 'refresh', candidate: null })).toBe(pair)
})
