import React from 'react'
import { IconSwap } from '../../components/common/IconSwap.jsx'
import { Tooltip } from '../../components/Tooltip.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../../shared/constants/tooltip.js'
import { useContentCopy } from './useContentCopy.js'

export function CodeToolbar({ language, pre, copyAction }) {
  const { copied, busy, copy } = useContentCopy(copyAction, () => pre.innerText ?? pre.textContent ?? '')
  return (
    <div className="mdp-code-block__actions">
      <span className="mdp-code-block__lang">{language || 'text'}</span>
      <Tooltip content="Copy code" showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS} suppressed={busy || copied}>
        <button
          type="button"
          data-mdp-react-control=""
          className={`mdp-code-block__copy${copied ? ' is-copied' : ''}`}
          aria-label={copied ? 'Copied' : 'Copy code to clipboard'}
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={copy}
        >
          <IconSwap name="copy" size={16} swapped={copied} />
        </button>
      </Tooltip>
    </div>
  )
}
