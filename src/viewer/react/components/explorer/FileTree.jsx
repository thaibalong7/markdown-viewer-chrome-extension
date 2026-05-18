export function flattenVisibleTree(nodes, expandedMap) {
  const rows = []

  function visit(list) {
    for (const node of list || []) {
      if (node?.type === 'file') {
        rows.push({
          type: 'file',
          node,
          depth: Math.max(1, Number(node.depth) || 1)
        })
        continue
      }

      const expanded = expandedMap?.get?.(node?.href) === true
      rows.push({
        type: 'folder',
        node,
        depth: Math.max(1, Number(node?.depth) || 1),
        expanded
      })

      if (expanded && Array.isArray(node?.children) && node.children.length) {
        visit(node.children)
      }
    }
  }

  visit(nodes)
  return rows
}
