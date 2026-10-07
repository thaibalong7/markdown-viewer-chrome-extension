import React from 'react'

const reactAttribute = name => /^(data|aria)-/.test(name) ? name : name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

export function IconShapes({ elements }) {
  return elements.map(([tag, attributes], index) => React.createElement(tag, {
    key: index,
    ...Object.fromEntries(Object.entries(attributes).map(([name, value]) => [reactAttribute(name), value]))
  }))
}
