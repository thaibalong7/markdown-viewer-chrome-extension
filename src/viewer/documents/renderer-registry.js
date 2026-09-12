const rendererLoaders = Object.freeze({
  markdown: () => import('./renderers/markdown-document-renderer.js'),
  text: () => import('./renderers/text-document-renderer.js'),
  mermaid: () => import('./renderers/mermaid-document-renderer.js'),
  image: () => import('./renderers/image-document-renderer.js')
})

export async function getDocumentRenderer(rendererId) {
  const load = rendererLoaders[rendererId]
  if (!load) throw new Error(`No document renderer is registered for "${rendererId}".`)
  const module = await load()
  if (typeof module.render !== 'function') {
    throw new Error(`Document renderer "${rendererId}" has no render() function.`)
  }
  return module
}
