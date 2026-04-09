const LOGGER_PREFIX = '[MD-VIEWER]'

function formatArgs(level, args) {
  return [`${LOGGER_PREFIX}[${level}]`, ...args]
}

export const logger = {
  debugEnabled: true,

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
