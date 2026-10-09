import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css

describe('explorer interaction styles', () => {
  it('owns Files insets locally without negative margins or viewport offsets', () => {
    expect(explorerCss).not.toContain('--mdp-explorer-scrollbar-outset')
    expect(explorerCss).not.toContain('--mdp-explorer-action-end')
    expect(explorerCss).toMatch(/\.mdp-explorer__scroll-region\s*\{[^}]*overflow-y: auto;/s)
    expect(explorerCss).not.toMatch(/\.mdp-explorer__scroll-region\s*\{[^}]*margin-inline-end:/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__toolbar\s*\{[^}]*padding: 4px var\(--mdp-explorer-action-inset\) 8px var\(--mdp-explorer-header-inset\);/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__context\s*\{[^}]*padding: var\(--mdp-explorer-context-padding\);/s)
    expect(explorerCss).not.toMatch(/\.mdp-explorer__context\s*\{[^}]*padding-inline(?:-start|-end)?:/s)
    expect(explorerCss).not.toMatch(/\.mdp-explorer__(?:context|details-content)\s*\{[^}]*margin-inline:/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__header\s*\{[^}]*padding: var\(--mdp-sidebar-header-inset\) 0 0;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__row-actions\s*\{[^}]*right: var\(--mdp-explorer-row-action-inset\);/s)
  })

  it('animates the details height and chevron, removes collapsed space, and respects reduced motion', () => {
    expect(explorerCss).toMatch(/\.mdp-explorer__details\s*\{[^}]*grid-template-rows: 0fr;[^}]*transition: grid-template-rows 200ms/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__details\.is-expanded\s*\{[^}]*grid-template-rows: 1fr;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__details-content\s*\{[^}]*visibility: hidden;[^}]*opacity: 0;[^}]*transition: opacity 160ms ease;/s)
    expect(explorerCss).not.toMatch(/visibility 0s linear/)
    expect(explorerCss).toMatch(/\.mdp-explorer__details-clip\s*\{[^}]*min-height: 0;[^}]*overflow: hidden;/s)
    expect(explorerCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.mdp-explorer__details,\s*\.mdp-explorer__details-content,\s*\.mdp-explorer__details-icon \[data-icon-part=chevron\]\s*\{\s*transition: none;/s)
    expect(explorerCss).toMatch(/@media \(pointer: coarse\)\s*\{\s*\.mdp-explorer\s*\{[^}]*--mdp-explorer-action-size: 44px;/s)
  })

  it('stages compact header actions when details collapse and disables that motion when requested', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__context-commands > \*\s*\{[^}]*animation: mdp-explorer-context-command-in 180ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\) both;/s
    )
    expect(explorerCss).toMatch(/\.mdp-explorer__context-commands > :nth-last-child\(2\)\s*\{[^}]*animation-delay: 25ms;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__context-commands > :nth-last-child\(3\)\s*\{[^}]*animation-delay: 50ms;/s)
    expect(explorerCss).toMatch(
      /@keyframes mdp-explorer-context-command-in\s*\{\s*from\s*\{[^}]*opacity: 0;[^}]*transform: translateX\(6px\) scale\(0\.92\);[^}]*\}\s*to\s*\{[^}]*opacity: 1;[^}]*transform: none;/s
    )
    expect(explorerCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.mdp-explorer__context-commands > \*\s*\{[^}]*animation: none;/
    )
  })

  it('rotates only the refresh arrow around its own center and honors reduced motion', () => {
    const arrow = String.raw`\.mdp-explorer__refresh-icon \[data-icon-part=arrow\]`
    expect(explorerCss).toMatch(new RegExp(`${arrow}\\s*\\{[^}]*transform-box:\\s*view-box;[^}]*transform-origin:\\s*17px 17px;`))
    expect(explorerCss).toMatch(new RegExp(`\\.is-refreshing ${arrow}\\s*\\{[^}]*animation:\\s*mdp-explorer-refresh-spin`))
    expect(explorerCss).not.toMatch(/\.is-refreshing \.mdp-explorer__refresh-icon\s*\{[^}]*animation:/)
    expect(explorerCss).toMatch(new RegExp(`@media \\(prefers-reduced-motion: reduce\\)\\s*\\{[^@]*${arrow}\\s*\\{[^}]*animation:\\s*none;`))
  })

  it('keeps the scan-limit Settings action flowing with the notice text', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__depth-notice \.mdp-explorer__settings-link\s*\{[^}]*display:\s*inline;[^}]*white-space:\s*normal;/s
    )
  })

  it('keeps the loading skeleton integrated with the panel background', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__loading\s*\{[^}]*padding:\s*8px 6px 4px;[^}]*background:\s*transparent;/s
    )
    expect(explorerCss).not.toMatch(
      /\.mdp-explorer__loading[^,{]*,[^{]*\.mdp-explorer__empty\s*\{[^}]*background:/s
    )
  })

  it('gives the active file action button visible hover, focus, and open feedback', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:hover,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:focus-visible,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn\.is-open[^{]*\{[^}]*background:\s*var\(--mdp-link-soft\);[^}]*color:\s*var\(--mdp-link\);[^}]*opacity:\s*1;/s
    )
  })

  it('replaces the Files copy-link icon with a checkmark while copied feedback is active', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__context-command\.is-copied\s*\{[^}]*color:\s*var\(--mdp-accent\);[^}]*background:\s*var\(--mdp-accent-soft\);[^}]*pointer-events:\s*none;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__context-command\.is-copied \.mdp-explorer__context-command-icon\s*\{[^}]*display:\s*none;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__context-command\.is-copied::after\s*\{[^}]*content:\s*"✓";/s
    )
  })

  it('keeps the overflow menu inside the rendered Files and viewport bounds', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__header\s*\{[^}]*container-type:\s*inline-size;[^}]*z-index:\s*11;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__row-menu\.mdp-explorer__context-menu\s*\{[^}]*right:\s*calc\(-1 \* \(var\(--mdp-explorer-action-size\) \+ var\(--mdp-explorer-action-gap\)\)\);[^}]*width:\s*240px;[^}]*max-width:\s*calc\(100cqw - 2 \* var\(--mdp-explorer-action-inset\)\);/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__row-menu\.mdp-explorer__context-menu\s*\{[^}]*max-height:\s*calc\(100dvh - 72px\);[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__row-menu\.mdp-explorer__context-menu \.mdp-explorer__row-menu-item:disabled:hover\s*\{[^}]*background:\s*transparent;/s
    )
  })

  it('uses file trailing space at rest and reserves it only for visible More actions', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-btn\s*\{[^}]*padding:\s*8px 6px 8px 2px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-label\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s
    )
    expect(explorerCss).toMatch(/\.mdp-explorer__node:hover \.mdp-explorer__node-btn,[^{]*\.mdp-explorer__node:focus-within \.mdp-explorer__node-btn,[^{]*\.mdp-explorer__node\.is-menu-open \.mdp-explorer__node-btn[^{]*\{[^}]*padding-right: calc\(var\(--mdp-explorer-row-action-inset\) \+ var\(--mdp-explorer-action-size\) \+ var\(--mdp-explorer-action-gap\)\);/s)
    expect(explorerCss).not.toMatch(/\.mdp-explorer__node\.is-active \.mdp-explorer__node-btn[^{]*\{[^}]*padding-right:/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-folder-row\s*\{[^}]*padding: 8px calc\(var\(--mdp-explorer-row-action-inset\) \+ var\(--mdp-explorer-action-size\) \+ 4px\) 8px 2px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-folder:hover \.mdp-explorer__folder-count,[^{]*\{[^}]*visibility: hidden;/s)
  })

  it('keeps file and folder artwork at the native 16px size inside stable row slots', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-icon\s*\{[^}]*width:\s*16px;[^}]*height:\s*19px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-icon svg\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-icon\s*\{[^}]*width:\s*16px;[^}]*height:\s*19px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-icon svg\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s
    )
  })

  it('uses soft tree rows while keeping names on one line and guides out of pointer input', () => {
    expect(explorerCss).toMatch(/\.mdp-explorer__node-btn\s*\{[^}]*gap:\s*4px;[^}]*border-radius:\s*8px;[^}]*white-space:\s*nowrap;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-folder-row\s*\{[^}]*gap:\s*4px;[^}]*margin-left: var\(--mdp-tree-row-indent, 0px\);/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__node-depth\s*\{[^}]*width:\s*10px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-chevron\s*\{[^}]*width:\s*10px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-chevron svg\s*\{[^}]*width: 12px;[^}]*height: 12px;[^}]*flex-shrink: 0;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-guide\.is-branch::after\s*\{[^}]*width: 5px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-guides\s*\{[^}]*pointer-events: none;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer--no-guides \.mdp-explorer__tree-guides\s*\{[^}]*visibility: hidden;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-guide\.is-branch::after\s*\{[^}]*border-bottom-left-radius: 4px;/s)
  })

  it('keeps the original row density and gives selection one soft surface without a competing stripe', () => {
    expect(explorerCss).toMatch(/\.mdp-explorer__node-btn\s*\{[^}]*min-height: 38px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__tree-folder-row\s*\{[^}]*min-height: 38px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__list--virtual\s*\{[^}]*gap: 0;/s)
    expect(explorerCss).toMatch(/@media \(pointer: coarse\)\s*\{[^@]*\.mdp-explorer__tree-folder-row\s*\{[^}]*min-height: 44px;/s)
    expect(explorerCss).toMatch(/\.mdp-explorer__node-btn\.is-active\s*\{[^}]*background: color-mix\(in srgb, var\(--mdp-link-soft\) 94%, var\(--mdp-surface\)\);/s)
    expect(explorerCss).not.toContain('.mdp-explorer__node-btn.is-active::before')
    expect(explorerCss).not.toMatch(/\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn\s*\{[^}]*opacity:/s)
  })

  it('animates virtual tree row entry, exit, layout shifts, and the folder chevron', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__list--tree\s*\{[^}]*transition:\s*height 180ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__list--tree > \.mdp-explorer__node,[^{]*\.mdp-explorer__list--tree > \.mdp-explorer__tree-folder\s*\{[^}]*transition:\s*transform 180ms/s
    )
    expect(explorerCss).toMatch(/@keyframes mdp-explorer-tree-row-in\s*\{[^@]*translate:\s*0 -6px;/s)
    expect(explorerCss).toMatch(/@keyframes mdp-explorer-tree-row-out\s*\{[^@]*opacity:\s*0;/s)
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-row\.is-expanded \.mdp-explorer__tree-chevron svg\s*\{[^}]*transform:\s*rotate\(90deg\);/s
    )
    expect(explorerCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.mdp-explorer__tree-chevron svg\s*\{[^}]*transition:\s*none;/s
    )
    expect(explorerCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.mdp-explorer__list--tree > \.is-tree-entering,[^{]*\.mdp-explorer__list--tree > \.is-tree-exiting\s*\{[^}]*animation:\s*none;/s
    )
  })
})
