import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { logger } from '../../../../shared/logger.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../../../../shared/constants/viewer.js'

/** Clipboard stays in the article action service; this hook owns presentation. */
export function useContentCopy(copyAction, getText) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)
  const timer = useRef(0)
  const focusAfterCommit = useRef(null)
  useLayoutEffect(() => {
    if (busy || !focusAfterCommit.current) return
    const button = focusAfterCommit.current
    focusAfterCommit.current = null
    const doc = button.ownerDocument
    if (button.isConnected && (doc.activeElement === button || doc.activeElement === doc.body)) button.focus({ preventScroll: true })
  }, [busy])
  useEffect(() => () => { generation.current++; clearTimeout(timer.current) }, [])
  async function copy(event) {
    event.preventDefault()
    event.stopPropagation()
    if (pending.current || !copyAction) return
    const token = generation.current
    const button = event.currentTarget
    pending.current = true
    setBusy(true)
    setCopied(false)
    clearTimeout(timer.current)
    try {
      const success = await copyAction(getText(), null, { inline: true })
      if (token !== generation.current) return
      setCopied(success !== false)
      timer.current = setTimeout(() => setCopied(false), COPY_BUTTON_FEEDBACK_MS)
    } catch (error) {
      logger.warn('Content copy action failed.', { errorName: error?.name || 'Error' })
      if (token === generation.current) setCopied(false)
    } finally {
      pending.current = false
      if (token === generation.current) {
        // A disabled native button may lose focus. Restore only after React has
        // committed disabled=false, and only while the fallback still owns focus.
        focusAfterCommit.current = button
        setBusy(false)
      }
    }
  }
  return { copied, busy, copy }
}
