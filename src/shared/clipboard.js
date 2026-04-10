/**
 * Copy plain text to the clipboard (Clipboard API with execCommand fallback).
 * @param {string} text
 */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('execCommand copy returned false')
  } finally {
    ta.remove()
  }
}
