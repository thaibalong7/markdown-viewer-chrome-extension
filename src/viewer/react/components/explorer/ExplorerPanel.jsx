import React from 'react'
import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'
import { useExplorer } from '../../hooks/useExplorer.js'
import { ExplorerHeader } from './ExplorerHeader.jsx'
import { ExplorerProgress } from './ExplorerProgress.jsx'
import { FileRow } from './FileRow.jsx'
import { FileTree } from './FileTree.jsx'

export function ExplorerPanel({ bridge }) {
  const { state, actions } = useExplorer({ bridge })
  const activeNormalized = normalizeFileUrlForCompare(state.activeFileUrl || '')

  return (
    <div className="mdp-explorer" role="region" aria-label="Markdown files in folder">
      <ExplorerHeader
        filesContext={state.filesContext}
        summaryDirectoryLabel={state.summaryDirectoryLabel}
        summaryFileCount={state.summaryFileCount}
        depthNotice={state.depthNotice}
        actionsMode={state.actionsMode}
        showBack={state.showBack}
        backLabel={state.backLabel}
        onBack={actions.onBack}
        onOpenAnotherFolder={actions.onOpenAnotherFolder}
        onExitWorkspace={actions.onExitWorkspace}
      />

      <div className="mdp-explorer__loading" hidden={state.view !== 'loading'}>
        Loading…
      </div>

      <div className="mdp-explorer__empty" hidden={state.view !== 'empty'}>
        No markdown files found in this directory.
      </div>

      <div hidden={state.view !== 'progress'}>
        <ExplorerProgress
          headline={state.progressHeadline}
          text={state.progressText}
          showCancel={state.showProgressCancel}
          onCancel={actions.onCancelProgress}
        />
      </div>

      <ul className="mdp-explorer__list" role="tree" aria-label="Files in current folder" hidden={state.view !== 'files'}>
        {state.files.map((file) => (
          <FileRow
            key={file.href}
            file={{ displayName: file.displayName, href: file.href }}
            depth={1}
            isActive={normalizeFileUrlForCompare(file.href || '') === activeNormalized}
            onPick={actions.onNavigate}
          />
        ))}
      </ul>

      <ul
        className="mdp-explorer__list"
        role="tree"
        aria-label={state.listAriaLabel || 'Workspace files'}
        hidden={state.view !== 'tree'}
      >
        <FileTree
          nodes={state.tree?.children || []}
          expandedMap={state.expandedMap}
          activeFileUrl={state.activeFileUrl}
          onToggleFolder={actions.onToggleFolder}
          onPickFile={actions.onNavigate}
        />
      </ul>
    </div>
  )
}
