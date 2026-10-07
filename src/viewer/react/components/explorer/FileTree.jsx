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

export function getTreeRowKey(row) {
  return `${row?.type || 'row'}:${row?.node?.href || ''}`
}

export function buildTreeMotionPlan(currentRows, nextRows, virtualItems = []) {
  const currentKeys = new Set(currentRows.map(getTreeRowKey))
  const nextKeys = new Set(nextRows.map(getTreeRowKey))
  const enteringKeys = new Set(
    nextRows.map(getTreeRowKey).filter((key) => !currentKeys.has(key))
  )
  const exitingRows = []

  for (const virtualItem of virtualItems) {
    const row = currentRows[virtualItem?.index]
    const key = getTreeRowKey(row)
    if (!row?.node || nextKeys.has(key)) continue
    exitingRows.push({
      key,
      row,
      start: Number(virtualItem?.start) || 0
    })
  }

  const currentOrder = currentRows.map(getTreeRowKey)
  const nextOrder = nextRows.map(getTreeRowKey)
  const active =
    currentOrder.length !== nextOrder.length ||
    currentOrder.some((key, index) => key !== nextOrder[index])

  return { active, enteringKeys, exitingRows }
}
