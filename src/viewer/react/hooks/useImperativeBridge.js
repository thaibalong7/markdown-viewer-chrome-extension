import { useEffect } from 'react'

export function useImperativeBridge(ref, mountFn, deps = []) {
  useEffect(() => {
    const target = ref?.current
    if (!target || typeof mountFn !== 'function') return undefined

    const cleanup = mountFn(target)
    return typeof cleanup === 'function' ? cleanup : undefined
  }, [ref, mountFn, ...deps])
}
