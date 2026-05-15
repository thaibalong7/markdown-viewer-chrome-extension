import { useEffect } from 'react'
import { useEditorDispatch } from '../contexts/EditorContext.jsx'

/**
 * Syncs imperative dirty state from `app.js` into EditorContext.
 * @param {{ dirty?: boolean }} props
 */
export function DirtySync({ dirty = false }) {
  const dispatch = useEditorDispatch()

  useEffect(() => {
    dispatch({ type: dirty ? 'MARK_DIRTY' : 'MARK_CLEAN' })
  }, [dirty, dispatch])

  return null
}
