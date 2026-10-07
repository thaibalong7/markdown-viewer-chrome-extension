import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const css = compile(fileURLToPath(new URL('../_change-review.scss', import.meta.url))).css

it('uses a bounded dialog with separate overview and diff regions', () => {
  expect(css).toMatch(/\.mdp-change-review\s*\{[^}]*display:\s*flex;[^}]*height:\s*min\(860px, (?:calc\()?100dvh - 40px\)?\);[^}]*overflow:\s*hidden;/s)
  expect(css).toMatch(/\.mdp-change-review__workspace\s*\{[^}]*grid-template-columns:\s*248px minmax\(0, 1fr\);[^}]*min-height:\s*0;/s)
  expect(css).toMatch(/\.mdp-change-review__overview\s*\{[^}]*overflow-y:\s*auto;[^}]*border-right:/s)
  expect(css).toMatch(/\.mdp-change-review__diff\s*\{[^}]*flex:\s*1;[^}]*overflow:\s*auto;/s)
})

it('keeps line gutters compact and stacks the review workspace on narrow screens', () => {
  expect(css).toMatch(/\.mdp-change-review__line-number\s*\{[^}]*width:\s*42px;[^}]*text-align:\s*right;/s)
  expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.mdp-change-review__workspace\s*\{[^}]*grid-template-columns:\s*1fr;/s)
})
