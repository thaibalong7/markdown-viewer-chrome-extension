import { describe, expect, it } from 'vitest'
import { createStyleVars } from '../index.js'

describe('createStyleVars', () => {
  it('exposes toast variant colors for the light reader theme', () => {
    const vars = createStyleVars({ theme: { preset: 'light' } })

    expect(vars['--mdp-toast-success-bg']).toBe('#ecfdf5')
    expect(vars['--mdp-toast-error-text']).toBe('#b91c1c')
  })

  it('exposes distinct toast variant colors for the dark reader theme', () => {
    const lightVars = createStyleVars({ theme: { preset: 'light' } })
    const darkVars = createStyleVars({ theme: { preset: 'dark' } })

    expect(darkVars['--mdp-toast-success-bg']).toBe('#063f2c')
    expect(darkVars['--mdp-toast-success-bg']).not.toBe(lightVars['--mdp-toast-success-bg'])
    expect(darkVars['--mdp-toast-error-text']).not.toBe(lightVars['--mdp-toast-error-text'])
  })
})
