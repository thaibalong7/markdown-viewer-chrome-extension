import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'

// All guide lanes belong to a row, so virtualization never removes their parent line.
// Measure hidden descendants too: collapsed folders retain their full indexed-file count.
export function flattenVisibleTree(nodes, expandedMap, activeFileUrl = '') {
  const rows = []
  const metadata = new Map()
  const active = normalizeFileUrlForCompare(activeFileUrl)

  function measure(node) {
    const meta = { fileCount: 0, containsActive: false }
    if (node.type === 'file') {
      meta.fileCount = 1
      meta.containsActive = Boolean(active) && normalizeFileUrlForCompare(node.href) === active
    } else {
      for (const child of node.children || []) {
        const childMeta = measure(child)
        meta.fileCount += childMeta.fileCount
        meta.containsActive ||= childMeta.containsActive
      }
    }
    metadata.set(node, meta)
    return meta
  }
  for (const node of nodes || []) measure(node)

  function visit(list, ancestors = [], parentPath = '') {
    for (const [index, node] of (list || []).entries()) {
      const meta = metadata.get(node)
      const hasNext = index < list.length - 1
      const expanded = node.type === 'folder' && expandedMap?.get?.(node.href) === true
      const path = parentPath ? `${parentPath}/${node.name}` : node.name
      const guides = ancestors.map((_, level) => {
        const branch = level === ancestors.length - 1
        const next = branch ? { hasNext, ...meta } : ancestors[level + 1]
        return { level, branch, continues: next.hasNext, active: next.containsActive }
      })
      const row = {
        type: node.type,
        node,
        depth: Math.max(1, Number(node?.depth) || 1),
        expanded,
        path,
        guides,
        ...meta,
        stem: expanded && Boolean(node.children?.length)
      }
      rows.push(row)
      if (expanded && Array.isArray(node?.children) && node.children.length) {
        visit(node.children, [...ancestors, { hasNext, ...meta }], path)
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
