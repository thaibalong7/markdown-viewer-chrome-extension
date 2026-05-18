import { useEffect, useRef, useState } from 'react'
import { COPY_BUTTON_FEEDBACK_MS } from '../../../shared/constants/viewer.js'

export function useCopyFeedback(feedbackMs = COPY_BUTTON_FEEDBACK_MS) {
  const timerRef = useRef(0)
  const [copied, setCopied] = useState(false)

  const flashCopied = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
    setCopied(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0
      setCopied(false)
    }, feedbackMs)
  }

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    },
    []
  )

  return { copied, flashCopied }
}
