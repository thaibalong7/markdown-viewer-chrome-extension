const LOGGER_PREFIX = '[MD-VIEWER]'

function formatArgs(level, args) {
  return [`${LOGGER_PREFIX}[${level}]`, ...args]
}

export const logger = {
  /** `true` in Vite dev; `false` in production builds. */
  debugEnabled: Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV),

  info(...args) {
    console.info(...formatArgs('INFO', args))
  },

  warn(...args) {
    console.warn(...formatArgs('WARN', args))
  },

  error(...args) {
    console.error(...formatArgs('ERROR', args))
  },

  debug(...args) {
    if (!this.debugEnabled) return
    console.debug(...formatArgs('DEBUG', args))
  }
}
