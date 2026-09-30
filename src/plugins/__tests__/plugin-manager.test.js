import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ warn: vi.fn() }))
vi.mock('../../shared/logger.js', () => ({ logger: { warn: mocks.warn } }))

import { createPluginManager } from '../plugin-manager.js'

function createSettings(pluginIds) {
  return {
    plugins: Object.fromEntries(pluginIds.map((pluginId) => [pluginId, { enabled: true }]))
  }
}

describe('plugin manager fault isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps available plugins when an optional plugin import fails', async () => {
    const onPluginWarning = vi.fn()
    const availablePlugin = { id: 'available' }
    const failedLoader = vi.fn().mockRejectedValue(new Error('dynamic import failed'))
    const availableLoader = vi.fn().mockResolvedValue(availablePlugin)

    const manager = await createPluginManager({
      settings: createSettings(['failed', 'available']),
      corePlugins: [],
      optionalPluginLoaders: {
        failed: failedLoader,
        available: availableLoader
      },
      onPluginWarning
    })

    expect(manager.getActivePlugins()).toEqual([availablePlugin])
    expect(onPluginWarning).toHaveBeenCalledWith({ pluginId: 'failed', hook: 'load' })
    expect(mocks.warn).toHaveBeenCalledWith(
      'Markdown plugin failed; continuing without it.',
      { pluginId: 'failed', hook: 'load', errorName: 'Error' }
    )
  })

  it('preserves basic Markdown and continues later hooks when one hook throws', async () => {
    const onPluginWarning = vi.fn()
    const brokenPlugin = {
      id: 'broken',
      preprocessMarkdown() {
        throw new Error('hook failed')
      }
    }
    const workingPlugin = {
      id: 'working',
      preprocessMarkdown({ value }) {
        return `${value}\n\nWorking enhancement`
      }
    }
    const manager = await createPluginManager({
      settings: createSettings(['broken', 'working']),
      corePlugins: [brokenPlugin, workingPlugin],
      optionalPluginLoaders: {}
    })

    const markdown = manager.preprocessMarkdown('# Basic Markdown', { onPluginWarning })

    expect(markdown).toBe('# Basic Markdown\n\nWorking enhancement')
    expect(onPluginWarning).toHaveBeenCalledWith({
      pluginId: 'broken',
      hook: 'preprocessMarkdown'
    })
    expect(manager.getActivePlugins()).toEqual([workingPlugin])
  })

  it('continues after async hook failures', async () => {
    const onPluginWarning = vi.fn()
    const markdownEngine = { instance: {} }
    const workingHook = vi.fn()
    const manager = await createPluginManager({
      settings: createSettings(['broken', 'working']),
      corePlugins: [
        {
          id: 'broken',
          async extendMarkdown() {
            throw new TypeError('extension failed')
          }
        },
        { id: 'working', extendMarkdown: workingHook }
      ],
      optionalPluginLoaders: {}
    })

    await expect(manager.extendMarkdown(markdownEngine, { onPluginWarning })).resolves.toEqual({
      failedPluginCount: 1
    })
    expect(workingHook).toHaveBeenCalledOnce()
    expect(onPluginWarning).toHaveBeenCalledWith({
      pluginId: 'broken',
      hook: 'extendMarkdown'
    })
  })

  it('continues after an afterRender hook fails', async () => {
    const onPluginWarning = vi.fn()
    const workingHook = vi.fn()
    const manager = await createPluginManager({
      settings: createSettings(['broken', 'working']),
      corePlugins: [
        {
          id: 'broken',
          afterRender() {
            throw new Error('after render failed')
          }
        },
        { id: 'working', afterRender: workingHook }
      ],
      optionalPluginLoaders: {}
    })

    await expect(manager.afterRender({ onPluginWarning })).resolves.toBeUndefined()
    expect(workingHook).toHaveBeenCalledOnce()
    expect(onPluginWarning).toHaveBeenCalledWith({
      pluginId: 'broken',
      hook: 'afterRender'
    })
  })

  it('runs every plugin cleanup even when an earlier cleanup throws', async () => {
    const onPluginWarning = vi.fn()
    const firstCleanup = vi.fn(() => {
      throw new Error('cleanup failed')
    })
    const secondCleanup = vi.fn()
    const manager = await createPluginManager({
      settings: createSettings(['first', 'second']),
      corePlugins: [
        { id: 'first', afterRender: () => firstCleanup },
        { id: 'second', afterRender: () => secondCleanup }
      ],
      optionalPluginLoaders: {}
    })

    const cleanup = await manager.afterRender({ onPluginWarning })
    expect(() => cleanup()).not.toThrow()

    expect(firstCleanup).toHaveBeenCalledOnce()
    expect(secondCleanup).toHaveBeenCalledOnce()
    expect(onPluginWarning).toHaveBeenCalledWith({ pluginId: 'first', hook: 'cleanup' })
  })

  it('does not expose thrown error messages in logs', async () => {
    const secretDocumentText = 'private document contents'
    const manager = await createPluginManager({
      settings: createSettings(['broken']),
      corePlugins: [
        {
          id: 'broken',
          preprocessMarkdown() {
            throw new Error(secretDocumentText)
          }
        }
      ],
      optionalPluginLoaders: {}
    })

    manager.preprocessMarkdown('# Private')

    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain(secretDocumentText)
  })
})
