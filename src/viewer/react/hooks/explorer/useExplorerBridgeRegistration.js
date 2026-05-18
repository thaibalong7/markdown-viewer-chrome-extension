import { useCallback, useEffect } from 'react'

export function useExplorerBridgeRegistration({ bridge, navigateToFileRef, workspaceVirtualReadersRef }) {
  const bridgeNavigateToFile = useCallback(
    (fileUrl, opts = {}) => navigateToFileRef.current?.(fileUrl, opts),
    [navigateToFileRef]
  )
  const bridgeVirtualFileExists = useCallback(
    (href) => workspaceVirtualReadersRef.current?.has(href) ?? false,
    [workspaceVirtualReadersRef]
  )

  useEffect(() => {
    if (!bridge) return undefined
    bridge.navigateToFile = bridgeNavigateToFile
    return () => {
      if (bridge.navigateToFile === bridgeNavigateToFile) {
        bridge.navigateToFile = null
      }
    }
  }, [bridge, bridgeNavigateToFile])

  useEffect(() => {
    if (!bridge) return undefined
    bridge.virtualFileExists = bridgeVirtualFileExists
    return () => {
      if (bridge.virtualFileExists === bridgeVirtualFileExists) {
        bridge.virtualFileExists = null
      }
    }
  }, [bridge, bridgeVirtualFileExists])
}
