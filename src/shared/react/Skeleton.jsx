import React from 'react'

function toCssSize(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`
  if (typeof value === 'string' && value.trim()) return value
  return fallback
}

export function SkeletonLine({ width = '100%', height = 14, className = '', style = {} }) {
  return (
    <span
      className={`mdp-skeleton-line ${className}`.trim()}
      aria-hidden="true"
      style={{
        width: toCssSize(width, '100%'),
        height: toCssSize(height, '14px'),
        ...style
      }}
    />
  )
}

export function SkeletonBlock({
  lines = 3,
  gap = 10,
  widths = [],
  lineHeight = 14,
  className = '',
  lineClassName = ''
}) {
  const count = Number.isFinite(Number(lines)) ? Math.max(1, Number(lines)) : 3
  const resolvedGap = Number.isFinite(Number(gap)) ? Math.max(0, Number(gap)) : 10

  return (
    <div
      className={`mdp-skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{ gap: `${resolvedGap}px` }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLine
          key={`skeleton-line-${index}`}
          width={widths[index] || '100%'}
          height={lineHeight}
          className={lineClassName}
        />
      ))}
    </div>
  )
}
