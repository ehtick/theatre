const EVALED = new Map<string, number>()
const INLINED = new Map<Function, Function>()

type $Fn = (this: any, ...args: any[]) => any

export type ILoggerOptimizedFunctionsOptions = {
  inline: {
    fn: {
      name: string
    } & $Fn
    arity: number
  }[]
  log?: {
    _hmm?: (message: string, args?: object) => void
    /** provide a function for debug information */
    _debug?: (message: string, args?: object) => void
  }
  _noFallback?: boolean
}

/**
 * This was designed and tuned specifically for inlining the code for
 * `logger.ts`. It's a nicely separable piece of work though.
 *
 * ## Testing
 * The best way to test this is to develop expansive tests for the original
 * reference function, then make it easy to swap between the reference
 * function and the inlined version for all tests.
 *
 * ### Test minified code
 *
 * We transpile for jest using `esbuild-jest`.
 * Unfortunately, `esbuild-jest` does not allow for configuring minify,
 * so you have to open `node_modules/esbuild-jest/esbuild-jest.js` and add
 * `minify: true` in the options passed to
 * `esbuild.transformSync(sources.code, { ..., minify: true })`
 *
 * Then, to actually get `jest` to recompile using the new settings, you have
 * to clear its cache.
 *
 * ```sh
 * # while in repo project root folder
 * yarn test --clearCache
 * # then, start logger tests
 * yarn test logger --watch
 * ```
 *
 * ### Use `describeLogger("...", (setup) => { ... })`
 *
 * You can do this relatively easy with a custom describe block like
 * ```ts
 * describeLogger("description name", setup => {
 *    test("specific behavior", () => {
 *      const h = setup()
 *    })
 * })
 * ```
 * Where, `setup` can be passed to two versions of the described.
 * e.g.
 * ```ts
 * function describeLogger(descriptionName, callback) {
 *   describe(descriptionName + " (reference)", () => {
 *     callback(setupFn.bind(null, "reference"))
 *   })
 *   describe(descriptionName + " (inline)", () => {
 *     callback(setupFn.bind(null, "inline"))
 *   })
 * }
 * ```
 *
 * ## TODO
 *
 * I'd like to have some way of automatically replacing the optimized function
 * if it throws. We might be able to do something along those lines using an extra
 * argument to the final `newFn` and then binding the function before returning.
 */
export function loggerOptimizedFunctions<F extends $Fn>(
  source: F,
  options: ILoggerOptimizedFunctionsOptions,
): F {
  try {
    const fn = source
    const existing = INLINED.get(fn)
    if (existing) return existing as any
    const fnContent = removeComments(fn.toString())
    const debugInlineSrcs: string[] = []
    let inlined = fnContent
    for (const toInline of options.inline) {
      const inlineFnSrc = removeComments(toInline.fn.toString())
      debugInlineSrcs.push(inlineFnSrc)
      try {
        const replacementRE =
          /(?:function \w+)?\s*\(([^\)]*)\)\s*(?:=>\s*([^;]+)$|\{\s*return\s*([^;]+)(:?;\s*)?\}\s*$)/
        const [, argIdentsSrc, bodyContentArrow, bodyContentBrackets] =
          inlineFnSrc.match(replacementRE)!
        const argIdents = argIdentsSrc.trim().split(/\s*,\s*/g)
        console.assert(
          argIdents.length === toInline.arity,
          'expected found arg idents to have same arity',
          {argIdentsSrc, argIdents, toInline},
        )
        let inlineReplacement = bodyContentArrow ?? bodyContentBrackets
        for (let i = 0; i < toInline.arity; i++) {
          inlineReplacement = inlineReplacement.replace(
            re(/\b/, argIdents[i], /\b/),
            `$${i + 1}`,
          )
        }
        const RE = re(
          /\b/,
          toInline.fn.name,
          '(',
          ...argIdents
            .flatMap((_ident) => [/((?:[\w$]+\.)*[\w$]+)/, /\s*,\s*/])
            .slice(0, -1),
          ')',
        )

        inlined = fnContent.replace(RE, inlineReplacement)
      } catch (err) {
        throw new Error(
          `Failed to inline function\n\n${inlineFnSrc}\n\n${(
            err as Error
          ).toString()}`,
        )
      }
    }

    const optimized = inlined
      .replace(
        re(/(\d+\s*&\s*\d+|\(\d+\s*&\s*\d+\))\s*===?\s*\d+/g),
        function (fullMatch) {
          return evalThis(fullMatch).toString(10)
        },
      )
      .replace(re('false ? ', /([^:\(]+)/, ' : ', /([^?,\(\)]+)(\))/), '$2$3')
      .replace(re(' true ? ', /([^:\(\)]+)/, ' : ', /([^,\(\)]+)\s*/), '$1') // good -210
      .replace(re('( false ? ', /([^:\(\)]+)/, ' : ', /([^?,\(\)]+)/), '($2') // good -72
      .replace(re('( true ? ', /([^:\(\)]+)/, ' : ', /([^?,\(\)]+)/), '($1')
      .replace(re('( false ? ', /([^:\(\)]+)/, ' : ', /([^?,\(\)]+)/), '($2') // good -48
      .replace(re(': ( true ) &&'), ':') // good -12
      .replace(re(': ( ', /(\w+(\.\w+)+)/, ' )'), ':$1') // good -16

    options.log?._debug?.('inlineFunction results', {
      source,
      inline: options.inline,
      inlined,
      inlinedLength: inlined.length,
      '✨optimized': optimized,
      optimizedLength: optimized.length,
    })

    let args: any[]
    try {
      // now pull apart the optimized function
      const [, argsSrc, inlinedBody] = optimized.match(
        /^[^{]+\(([^)]+)\)\s*\{([\s\S]+)\}$/,
      )!

      args = [
        ...argsSrc.trim().split(/\s*\,\s*/g),
        // "use strict"
        //  * Learn: https://www.w3schools.com/js/js_strict.asp
        //  * Inspired by: https://github.com/expressjs/morgan/blob/19a6aa5369220b522e9dac007975ee66b1c38283/index.js#L399
        `"use strict"; try{${inlinedBody}}catch(err){throw new Error(err.toString()+"\\n\\nFunction definition:\\n" + ${JSON.stringify(
          inlinedBody,
        )})}`,
      ]
    } catch {
      throw new Error(`Failed to match function of\n${optimized}`)
    }

    try {
      const newFn = new Function(...args) as any
      INLINED.set(fn, newFn)
      return newFn
    } catch (err) {
      throw new Error(
        `Failed to create function: ${(err as Error).toString()}\n\n${args.join(
          '\n',
        )}\n\n\nOriginal inlines:\n\n${debugInlineSrcs.join(
          '\n\n',
        )}\n\n\nOriginal:\n\n${fnContent}`,
      )
    }
  } catch (err) {
    if (options._noFallback) {
      throw err
    } else {
      options.log?._hmm?.(
        `Failed to inline function: ${
          err instanceof Error ? err.toString() : JSON.stringify(err)
        }`,
      )
      INLINED.set(source, source)
      return source
    }
  }
}

function removeComments(code: string): string {
  return code.replace(/\s*\/\*.*?\*\/\s*/g, '')
}

function evalThis(expr: string): number {
  const found = EVALED.get(expr)
  if (found != null) return found
  const determine = (0, eval)(expr)
  EVALED.set(expr, determine)
  return determine
}

function re(...args: (string | RegExp)[]): RegExp {
  return new RegExp(
    args
      .map((s) =>
        typeof s === 'string'
          ? s
              .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
              .replace(/true/g, '(?:true|!0)')
              .replace(/false/g, '(?:false|!1)')
              .replace(/ /g, '\\s*')
          : s.source,
      )
      .join(''),
    'g',
  )
}
