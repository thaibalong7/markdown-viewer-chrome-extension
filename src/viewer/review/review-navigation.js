/** Navigate only a heading that exists in the currently rendered reviewed revision. */
export function navigateReviewSection({ session, pair, section, article, editorProtected }) {
  const target = session.getWatchTarget()
  if (!target || editorProtected || target.generation !== pair.generation || target.acceptedSource !== pair.after || section.removed || section.newLine === null) return false
  const heading = [...(article?.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line]') || [])]
    .find((node) => Number(node.getAttribute('data-line')) === section.newLine - 1)
  if (!heading) return false
  heading.scrollIntoView({ block: 'start', behavior: 'instant' })
  return true
}
