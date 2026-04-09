function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function deepMerge(base, override) {
  if (!isPlainObject(base)) return override
  const output = { ...base }
  if (!isPlainObject(override)) return output

  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      output[key] = value.slice()
    } else if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = deepMerge(output[key], value)
    } else {
      output[key] = value
    }
  }

  return output
}

export { deepMerge, isPlainObject }
