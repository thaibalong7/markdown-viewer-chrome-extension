import { useEffect, useRef, useState } from 'react'
import { createWatchUpdateFeedback } from './watch-update-feedback.js'

export function useWatchUpdateFeedback(state, isEditMode) {
  const [phase, setPhase] = useState(null)
  const feedbackRef = useRef(null)
  if (!feedbackRef.current) feedbackRef.current = createWatchUpdateFeedback(setPhase)
  useEffect(() => {
    feedbackRef.current.sync({ ...state, isEditMode })
  }, [state, isEditMode])
  useEffect(() => () => feedbackRef.current.cancel(false), [])
  return { phase, start: () => feedbackRef.current.start(state) }
}
