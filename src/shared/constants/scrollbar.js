export const SCROLLBAR_VISIBILITY = Object.freeze({
  AUTO: 'auto',
  ALWAYS: 'always'
})

export const DEFAULT_SCROLLBAR_VISIBILITY = SCROLLBAR_VISIBILITY.AUTO

export function normalizeScrollbarVisibility(value) {
  return value === SCROLLBAR_VISIBILITY.ALWAYS
    ? SCROLLBAR_VISIBILITY.ALWAYS
    : SCROLLBAR_VISIBILITY.AUTO
}
