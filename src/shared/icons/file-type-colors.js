/** Stable file-type hues, with separate shades for light and dark surfaces. */
export const FILE_TYPE_COLORS = {
  markdown: { light: '#3276C3', dark: '#6AA9EC' },
  text: { light: '#687686', dark: '#A4AEBB' },
  database: { light: '#117F80', dark: '#4CB9B6' },
  schema: { light: '#8061C3', dark: '#B39AE9' },
  diagram: { light: '#C14F72', dark: '#E889A5' },
  image: { light: '#3F804B', dark: '#82BA80' },
  vector: { light: '#B85C24', dark: '#EAA166' }
}

export function getFileTypeIconStyleVars(colorScheme = 'light') {
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'
  return Object.fromEntries(Object.entries(FILE_TYPE_COLORS)
    .map(([name, shades]) => [`--mdp-file-icon-${name}`, shades[scheme]]))
}
