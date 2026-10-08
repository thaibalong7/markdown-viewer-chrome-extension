/** Only explicit Open/Refresh selects sources; polling can only invalidate a document. */
export function reviewPairReducer(pair, action) {
  if (action.type === 'close') return null
  if (action.type === 'open' || action.type === 'refresh') return action.candidate ? { ...action.candidate } : pair
  if (action.type === 'sync' && (!action.available || pair?.generation !== action.generation)) return null
  return pair
}

export function reviewPairChanged(pair, candidate, acceptedSource) {
  return candidate ? candidate.before !== pair.before || candidate.after !== pair.after : acceptedSource !== pair.after
}
