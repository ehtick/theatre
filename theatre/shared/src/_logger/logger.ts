import {loggerOptimizedFunctions} from './loggerOptimizedFunctions'
import type {ILoggerOptimizedFunctionsOptions} from './loggerOptimizedFunctions'

/** @public configuration type */
export interface ITheatreLogger {
  error(message: string, args?: object): void
  warn(message: string, args?: object): void
  debug(message: string, args?: object): void
  trace(message: string, args?: object): void
}

/** @public configuration type */
export interface ITheatreConsoleLogger {
  /** ERROR level */
  error(message: string, ...args: any[]): void
  /** WARN level */
  warn(message: string, ...args: any[]): void
  /** DEBUG level */
  info(message: string, ...args: any[]): void
  /** TRACE level */
  debug(message: string, ...args: any[]): void
}

/**
 * "Downgraded" {@link ILogger} for passing down to utility functions.
 *
 * A util logger is usually back by some specific {@link _Audience}.
 */
export interface IUtilLogger {
  /** Usually equivalent to `console.error`. */
  error(message: string, args?: object): void
  /** Usually equivalent to `console.warn`. */
  warn(message: string, args?: object): void
  /** Usually equivalent to `console.info`. */
  debug(message: string, args?: object): void
  /** Usually equivalent to `console.debug`. */
  trace(message: string, args?: object): void
  named(name: string, key?: string): IUtilLogger
}

type LogFn = (message: string, args?: object) => void

export type _LogFns = Readonly<{
  _hmm: LogFn
  _todo: LogFn
  _error: LogFn
  errorDev: LogFn
  errorPublic: LogFn
  _kapow: LogFn
  _warn: LogFn
  warnDev: LogFn
  warnPublic: LogFn
  _debug: LogFn
  debugDev: LogFn
  _trace: LogFn
  traceDev: LogFn
}>

/** Internal library logger */
export interface ILogger extends _LogFns {
  named(name: string, key?: string | number): ILogger
  readonly downgrade: {
    internal(): IUtilLogger
    dev(): IUtilLogger
    public(): IUtilLogger
  }
}

export type ITheatreLoggerConfig =
  | /** default {@link console} */
  'console'
  | {
      type: 'console'
      /** default `true` */
      style?: boolean
      /** default {@link console} */
      console?: ITheatreConsoleLogger
    }
  | {
      type: 'named'
      named(names: string[]): ITheatreLogger
    }
  | {
      type: 'keyed'
      keyed(
        nameAndKeys: {
          name: string
          key?: string | number
        }[],
      ): ITheatreLogger
    }

export type ITheatreLogSource = {names: {name: string; key?: number | string}[]}

export type ITheatreLogIncludes = {
  /**
   * General information max level.
   * e.g. `Project imported might be corrupted`
   */
  max?: TheatreLoggerLevel
  /**
   * Include logs meant for developers using Theatre.js
   * e.g. `Created new project 'Abc' with options {...}`
   */
  dev?: boolean
  /**
   * Include logs meant for internal development of Theatre.js
   * e.g. `Migrated project 'Abc' { duration_ms: 34, from_version: 1, to_version: 3, imported_settings: false }`
   */
  internal?: boolean
}

export type ITheatreLoggingConfig = ITheatreLogIncludes & {
  include?: (source: ITheatreLogSource) => ITheatreLogIncludes
  consoleStyle?: boolean
}

/** @internal */
enum _Category {
  GENERAL = 0,
  TODO = 1 << 0,
  TROUBLESHOOTING = 1 << 1,
}

/** @internal */
enum _Audience {
  /** Logs for developers of Theatre.js */
  INTERNAL = 0,
  /** Logs for developers using Theatre.js */
  DEV = (1 << 2) | _Audience.INTERNAL,
  /** Logs for users of the app using Theatre.js */
  PUBLIC = (1 << 3) | _Audience.INTERNAL | _Audience.DEV,
}

export enum TheatreLoggerLevel {
  TRACE = 0,
  DEBUG = 1 << 4,
  WARN = 1 << 5,
  ERROR = 1 << 6,
}

/**
 * @internal
 *
 * You'd think max, means number "max", but since we use this system of bit flags,
 * we actually need to go the other way, with comparisons being math less than.
 *
 * NOTE: Keep this in the same file as {@link _Audience} to ensure basic compilers
 * can inline the enum values.
 */
function shouldLog(
  includes: Required<ITheatreLogIncludes>,
  level: _LoggerLevel,
) {
  return (
    ((level & _Audience.PUBLIC) === _Audience.PUBLIC
      ? true
      : (level & _Audience.DEV) === _Audience.DEV
      ? includes.dev
      : (level & _Audience.INTERNAL) === _Audience.INTERNAL
      ? includes.internal
      : false) && includes.max <= level
  )
}

export {shouldLog as _loggerShouldLog}

/**
 * @internal Theatre internal "dev" levels are odd numbers
 *
 * You can check if a level is odd quickly by doing `level & 1 === 1`
 */
export enum _LoggerLevel {
  /** The highest logging level number. */
  ERROR_PUBLIC = TheatreLoggerLevel.ERROR |
    _Audience.PUBLIC |
    _Category.GENERAL,
  ERROR_DEV = TheatreLoggerLevel.ERROR | _Audience.DEV | _Category.GENERAL,
  /** @internal this was an unexpected event */
  _HMM = TheatreLoggerLevel.ERROR |
    _Audience.INTERNAL |
    _Category.TROUBLESHOOTING,
  _TODO = TheatreLoggerLevel.ERROR | _Audience.INTERNAL | _Category.TODO,
  _ERROR = TheatreLoggerLevel.ERROR | _Audience.INTERNAL | _Category.GENERAL,
  WARN_PUBLIC = TheatreLoggerLevel.WARN | _Audience.PUBLIC | _Category.GENERAL,
  WARN_DEV = TheatreLoggerLevel.WARN | _Audience.DEV | _Category.GENERAL,
  /** @internal surface this in this moment, but it probably shouldn't be left in the code after debugging. */
  _KAPOW = TheatreLoggerLevel.WARN |
    _Audience.INTERNAL |
    _Category.TROUBLESHOOTING,
  _WARN = TheatreLoggerLevel.WARN | _Audience.INTERNAL | _Category.GENERAL,
  DEBUG_DEV = TheatreLoggerLevel.DEBUG | _Audience.DEV | _Category.GENERAL,
  /** @internal debug logs for implementation details */
  _DEBUG = TheatreLoggerLevel.DEBUG | _Audience.INTERNAL | _Category.GENERAL,
  /** trace logs like when the project is saved */
  TRACE_DEV = TheatreLoggerLevel.TRACE | _Audience.DEV | _Category.GENERAL,
  /**
   * The lowest logging level number.
   * @internal trace logs for implementation details
   */
  _TRACE = TheatreLoggerLevel.TRACE | _Audience.INTERNAL | _Category.GENERAL,
}

type InternalLoggerStyleRef = {
  italic?: RegExp
  bold?: RegExp
  color?: (name: string) => string
  collapseOnRE: RegExp
  cssMemo: Map<string, string>
  css(this: InternalLoggerStyleRef, name: string): string
  collapsed(this: InternalLoggerStyleRef, name: string): string
}

type InternalLoggerRef = {
  loggingConsoleStyle: boolean
  loggerConsoleStyle: boolean
  includes: Required<ITheatreLogIncludes>
  filtered: (
    this: ITheatreLogSource,
    level: _LoggerLevel,
    message: string,
    args?: object,
  ) => void
  include: (obj: ITheatreLogSource) => ITheatreLogIncludes
  create: (obj: ITheatreLogSource) => ILogger
  style: InternalLoggerStyleRef
  named(
    this: InternalLoggerRef,
    parent: ITheatreLogSource,
    name: string,
    key?: number | string,
  ): ILogger
}

const DEFAULTS: InternalLoggerRef = {
  loggingConsoleStyle: true,
  loggerConsoleStyle: true,
  includes: Object.freeze({
    internal: false,
    dev: false,
    max: TheatreLoggerLevel.WARN,
  }),
  filtered: function defaultFiltered() {},
  include: function defaultInclude() {
    return {}
  },
  create: null!,
  named(this: InternalLoggerRef, parent, name, key) {
    return this.create({
      names: [...parent.names, {name, key}],
    })
  },
  style: {
    bold: undefined, // /Service$/
    italic: undefined, // /Model$/
    cssMemo: new Map<string, string>([
      // handle empty names so we don't have to check for
      // name.length > 0 during this.css('')
      ['', ''],
      // bring a specific override
      // ["Marker", "color:#aea9ff;font-size:0.75em;text-transform:uppercase"]
    ]),
    collapseOnRE: /[a-z- ]+/g,
    color: undefined,
    // create collapsed name
    // insert collapsed name into cssMemo with original's style
    collapsed(this, name) {
      if (name.length < 5) return name
      const collapsed = name.replace(this.collapseOnRE, '')
      if (!this.cssMemo.has(collapsed)) {
        this.cssMemo.set(collapsed, this.css(name))
      }
      return collapsed
    },
    css(this, name): string {
      const found = this.cssMemo.get(name)
      if (found) return found
      let css = `color:${
        this.color?.(name) ??
        `hsl(${
          (name.charCodeAt(0) + name.charCodeAt(name.length - 1)) % 360
        }, 100%, 60%)`
      }`
      if (this.bold?.test(name)) {
        css += ';font-weight:600'
      }
      if (this.italic?.test(name)) {
        css += ';font-style:italic'
      }
      this.cssMemo.set(name, css)
      return css
    },
  },
}

/** @internal */
export type ITheatreInternalLogger = {
  configureLogger(config: ITheatreLoggerConfig): void
  configureLogging(config: ITheatreLoggingConfig): void
  getLogger(): ILogger
}
export type ITheatreInternalLoggerOptions = {
  _optimized:
    | false
    | {
        /** will use original if fails to optimize function */
        withFallback: boolean
      }
}

export function createTheatreInternalLogger(
  useConsole: ITheatreConsoleLogger = console,
  options: ITheatreInternalLoggerOptions,
): ITheatreInternalLogger {
  const ref: InternalLoggerRef = {...DEFAULTS, includes: {...DEFAULTS.includes}}
  const optimizedOptions: ILoggerOptimizedFunctionsOptions = {
    inline: [{fn: shouldLog, arity: 2}],
    log: {
      // Enable debug logging
      // _debug: console.debug,
      _hmm: console.error,
    },
    _noFallback: options._optimized && options._optimized.withFallback,
  }
  const createConsole = iif(() => {
    const createLoggerStyled =
      options._optimized === false
        ? TEMPLATE_CONSOLE_LOGGER
        : loggerOptimizedFunctions(TEMPLATE_CONSOLE_LOGGER, optimizedOptions)
    const createLoggerNoStyle =
      options._optimized === false
        ? TEMPLATE_CONSOLE_LOGGER_NO_STYLE
        : loggerOptimizedFunctions(
            TEMPLATE_CONSOLE_LOGGER_NO_STYLE,
            optimizedOptions,
          )
    const styled = createLoggerStyled.bind(ref, useConsole)
    const noStyle = createLoggerNoStyle.bind(ref, useConsole)
    return {styled, noStyle}
  })
  function getCreate() {
    return ref.loggingConsoleStyle && ref.loggerConsoleStyle
      ? createConsole.styled
      : createConsole.noStyle
  }
  ref.create = getCreate()

  return {
    configureLogger(config) {
      if (config === 'console') {
        ref.loggerConsoleStyle = DEFAULTS.loggerConsoleStyle
        ref.create = getCreate()
      } else if (config.type === 'console') {
        ref.loggerConsoleStyle = config.style ?? DEFAULTS.loggerConsoleStyle
        ref.create = getCreate()
      }
    },
    configureLogging(config) {
      ref.includes.dev = config.dev ?? DEFAULTS.includes.dev
      ref.includes.internal = config.internal ?? DEFAULTS.includes.internal
      ref.includes.max = config.max ?? DEFAULTS.includes.max
      ref.include = config.include ?? DEFAULTS.include
      ref.loggingConsoleStyle =
        config.consoleStyle ?? DEFAULTS.loggingConsoleStyle
      ref.create = getCreate()
    },
    getLogger() {
      return ref.create({names: []})
    },
  }
}

function iif<R>(fn: () => R): R {
  return fn()
}

function TEMPLATE_CONSOLE_LOGGER(
  this: InternalLoggerRef,
  con: ITheatreConsoleLogger,
  source: ITheatreLogSource,
): ILogger {
  const includes = {...this.includes, ...this.include(source)}

  const styleArgs: any[] = []
  let prefix = ''
  for (let i = 0; i < source.names.length; i++) {
    const {name, key} = source.names[i]
    prefix += ` %c${name}`
    styleArgs.push(this.style.css(name))
    if (key != null) {
      const keyStr = `%c#${key}`
      prefix += keyStr
      styleArgs.push(this.style.css(keyStr))
    }
  }

  const f = this.filtered
  f.bind(source, _LoggerLevel.WARN_PUBLIC)
  const _error = shouldLog(includes, _LoggerLevel._ERROR)
    ? con.error.bind(con, prefix, ...styleArgs)
    : f.bind(source, _LoggerLevel._ERROR)
  const logger: ILogger = {
    _hmm: _error,
    _todo: _error,
    _error,
    errorDev: shouldLog(includes, _LoggerLevel.ERROR_DEV)
      ? con.error.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.ERROR_DEV),
    errorPublic: shouldLog(includes, _LoggerLevel.ERROR_PUBLIC)
      ? con.error.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.ERROR_PUBLIC),
    // TODO: make this a real "kapow" style
    _kapow: shouldLog(includes, _LoggerLevel._WARN)
      ? con.warn.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel._WARN),
    _warn: shouldLog(includes, _LoggerLevel._WARN)
      ? con.warn.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel._WARN),
    warnDev: shouldLog(includes, _LoggerLevel.WARN_DEV)
      ? con.warn.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.WARN_DEV),
    warnPublic: shouldLog(includes, _LoggerLevel.WARN_PUBLIC)
      ? con.warn.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.WARN_DEV),
    _debug: shouldLog(includes, _LoggerLevel._DEBUG)
      ? con.info.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel._DEBUG),
    debugDev: shouldLog(includes, _LoggerLevel.DEBUG_DEV)
      ? con.info.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.DEBUG_DEV),
    _trace: shouldLog(includes, _LoggerLevel._TRACE)
      ? con.debug.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel._TRACE),
    traceDev: shouldLog(includes, _LoggerLevel.TRACE_DEV)
      ? con.debug.bind(con, prefix, ...styleArgs)
      : f.bind(source, _LoggerLevel.TRACE_DEV),
    named: this.named.bind(this, source),
    downgrade: {
      internal() {
        return {
          debug: logger._debug,
          error: logger._error,
          warn: logger._warn,
          trace: logger._trace,
          named(name, key) {
            return logger.named(name, key).downgrade.internal()
          },
        }
      },
      dev() {
        return {
          debug: logger.debugDev,
          error: logger.errorDev,
          warn: logger.warnDev,
          trace: logger.traceDev,
          named(name, key) {
            return logger.named(name, key).downgrade.dev()
          },
        }
      },
      public() {
        return {
          error: logger.errorPublic,
          warn: logger.warnPublic,
          debug(message, obj) {
            logger._warn(`(public "debug" filtered out) ${message}`, obj)
          },
          trace(message, obj) {
            logger._warn(`(public "trace" filtered out) ${message}`, obj)
          },
          named(name, key) {
            return logger.named(name, key).downgrade.public()
          },
        }
      },
    },
  }

  return logger
}

function TEMPLATE_CONSOLE_LOGGER_NO_STYLE(
  this: InternalLoggerRef,
  con: ITheatreConsoleLogger,
  source: ITheatreLogSource,
): ILogger {
  const includes = {...this.includes, ...this.include(source)}

  let prefix = ''
  for (let i = 0; i < source.names.length; i++) {
    const {name, key} = source.names[i]
    prefix += ` ${name}`
    if (key != null) {
      prefix += `#${key}`
    }
  }

  const f = this.filtered
  f.bind(source, _LoggerLevel.WARN_PUBLIC)
  const _error = shouldLog(includes, _LoggerLevel._ERROR)
    ? con.error.bind(con, prefix)
    : f.bind(source, _LoggerLevel._ERROR)
  const logger: ILogger = {
    _hmm: _error,
    _todo: _error,
    _error,
    errorDev: shouldLog(includes, _LoggerLevel.ERROR_DEV)
      ? con.error.bind(con, prefix)
      : f.bind(source, _LoggerLevel.ERROR_DEV),
    errorPublic: shouldLog(includes, _LoggerLevel.ERROR_PUBLIC)
      ? con.error.bind(con, prefix)
      : f.bind(source, _LoggerLevel.ERROR_PUBLIC),
    // TODO: make this a real "kapow" style
    _kapow: shouldLog(includes, _LoggerLevel._WARN)
      ? con.warn.bind(con, prefix)
      : f.bind(source, _LoggerLevel._WARN),
    _warn: shouldLog(includes, _LoggerLevel._WARN)
      ? con.warn.bind(con, prefix)
      : f.bind(source, _LoggerLevel._WARN),
    warnDev: shouldLog(includes, _LoggerLevel.WARN_DEV)
      ? con.warn.bind(con, prefix)
      : f.bind(source, _LoggerLevel.WARN_DEV),
    warnPublic: shouldLog(includes, _LoggerLevel.WARN_PUBLIC)
      ? con.warn.bind(con, prefix)
      : f.bind(source, _LoggerLevel.WARN_DEV),
    _debug: shouldLog(includes, _LoggerLevel._DEBUG)
      ? con.info.bind(con, prefix)
      : f.bind(source, _LoggerLevel._DEBUG),
    debugDev: shouldLog(includes, _LoggerLevel.DEBUG_DEV)
      ? con.info.bind(con, prefix)
      : f.bind(source, _LoggerLevel.DEBUG_DEV),
    _trace: shouldLog(includes, _LoggerLevel._TRACE)
      ? con.debug.bind(con, prefix)
      : f.bind(source, _LoggerLevel._TRACE),
    traceDev: shouldLog(includes, _LoggerLevel.TRACE_DEV)
      ? con.debug.bind(con, prefix)
      : f.bind(source, _LoggerLevel.TRACE_DEV),
    named: this.named.bind(this, source),
    downgrade: {
      internal() {
        return {
          debug: logger._debug,
          error: logger._error,
          warn: logger._warn,
          trace: logger._trace,
          named(name, key) {
            return logger.named(name, key).downgrade.internal()
          },
        }
      },
      dev() {
        return {
          debug: logger.debugDev,
          error: logger.errorDev,
          warn: logger.warnDev,
          trace: logger.traceDev,
          named(name, key) {
            return logger.named(name, key).downgrade.dev()
          },
        }
      },
      public() {
        return {
          error: logger.errorPublic,
          warn: logger.warnPublic,
          debug(message, obj) {
            logger._warn(`(public "debug" filtered out) ${message}`, obj)
          },
          trace(message, obj) {
            logger._warn(`(public "trace" filtered out) ${message}`, obj)
          },
          named(name, key) {
            return logger.named(name, key).downgrade.public()
          },
        }
      },
    },
  }

  return logger
}
