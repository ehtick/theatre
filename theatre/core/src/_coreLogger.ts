import type {
  ITheatreLoggerConfig,
  ITheatreLoggingConfig,
} from '@theatre/shared/logger'
import {createTheatreInternalLogger} from '@theatre/shared/logger'

export type CoreLoggingConfig = Partial<{
  logger: ITheatreLoggerConfig
  logging: ITheatreLoggingConfig
}>

export function _coreLogger(config?: CoreLoggingConfig) {
  const internal = createTheatreInternalLogger(undefined, {
    _optimized: {withFallback: true},
  })

  if (config) {
    const {logger, logging} = config
    if (logger) internal.configureLogger(logger)
    if (logging) internal.configureLogging(logging)
    else {
      // default to showing Theatre.js dev logs in non-production environments
      internal.configureLogging({
        dev: process.env.NODE_ENV !== 'production',
      })
    }
  }

  return internal.getLogger().named('Theatre')
}
