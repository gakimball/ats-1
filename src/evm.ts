import { EVMCallback, EVMClosure, EVMTuple, EVMType, EVM_CALLBACK, TUPLE_TYPE } from './types/machine-type';
import { EVMContext, createEVMContext, finalizeEVMContext, parseEVMContextMarker } from './utils/evm-context';
import { EVMError } from './utils/evm-error';
import { getElseOrEndToken } from './utils/get-else-or-end-token';
import { getEndTokenIndex } from './utils/get-end-token';
import { getEVMType } from './utils/get-evm-type';
import { resolveVariable } from './utils/resolve-variable';
import { stringifyEVMValue } from './utils/stringify-evm-value';
import { ENO_WORDS } from './utils/words';

const TUPLE_ORDER = Symbol('TUPLE_ORDER')

interface EVMSyscallArgs {
  pop: () => EVMType;
  push: (value: EVMType) => void;
  variable: (name: string) => EVMType;
  num: (value: EVMType) => number;
  list: (value: EVMType) => EVMType[];
  execute: (script: string) => void;
  tuple: (type: string, value: EVMType) => EVMTuple;
  string: (value: EVMType) => string;
}

export type EVMSyscall = (args: EVMSyscallArgs) => void

interface EVMTupleBlueprint {
  [TUPLE_ORDER]: string[];
  [K: string]: EVMType;
}

export class EVM {
  private readonly stack: Array<EVMType> = []

  /**
   * Map of global variables, which are accessible anywhere in the script.
   */
  private readonly variables: EVMClosure = {}

  /** List of variables that are constant. */
  private readonly constants: string[] = []

  /**
   * Map of user-defined functions; each value is the function body.
   */
  private readonly functions: {
    [name: string]: string;
  } = {}

  /**
   * Map of user-defined tuples; each value includes the expected order of the properties, and a
   * map of default values.
   */
  private readonly tuples: {
    [name: string]: {
      [TUPLE_ORDER]: string[];
      [key: string]: EVMType;
    };
  } = {}

  /**
   * Map of helper methods that are passed to external syscalls. This includes stack manipulation
   * functions, and type guards.
   */
  private syscallArgs: EVMSyscallArgs = {
    /** Pop the top value off the stack. */
    pop: () => this.pop(),
    /** Push a value onto the stack. */
    push: value => this.push(value),
    /**
     * Get the value of a variable. No stack manipulation occurs.
     * @throws Throws if the variable is not defined.
     */
    variable: name => {
      if (name in this.variables) {
        return this.variables[name]
      }

      throw new Error(`Syscall error: no variable named ${name}`)
    },
    /**
     * Assert that `value` is a number.
     * @throws Throws if `value` is not a number.
     */
    num: value => {
      if (typeof value === 'number') {
        return value
      }

      throw new Error(`Syscall error: expected a number, got ${getEVMType(value)}`)
    },
    /**
     * Assert that `value` is a list.
     * @throws Throws if `value` is not a list.
     */
    list: value => {
      if (Array.isArray(value)) {
        return value
      }

      throw new Error(`Syscall error: expected a list, got ${getEVMType(value)}`)
    },
    /**
     * Assert that `value` is a tuple of the given type.
     * @throws Throws if `value` is not the right type.
     */
    tuple: (type, value) => {
      if (typeof value === 'object' && TUPLE_TYPE in value && value[TUPLE_TYPE] === type) {
        return value
      }

      throw new Error(`Syscall error: expected ${type}, got ${getEVMType(value)}`)
    },
    /**
     * Run the given script within the machine's context.
     * @returns The current stack formatted as a string.
     */
    execute: script => this.execute(script),
    /**
     * Assert that `value` is a string.
     * @throws Throws if `value` is not a string.
     */
    string: value => {
      if (typeof value !== 'string') {
        throw new Error(`Syscall error, expected a string, got ${getEVMType(value)}`)
      }

      return value
    },
  }

  constructor(
    private readonly syscalls: {
      [name: string]: EVMSyscall
    } = {}
  ) {}

  getStack() {
    return [...this.stack]
  }

  execute(input: string, outerClosures: EVMClosure[] = [this.variables]) {
    const tokens = input.trim().replace(/\([^)]+\)/g, '').split(/\s+/)
    let index = -1
    const contexts: EVMContext[] = []

    if (tokens.length === 1 && tokens[0] === '') {
      // Skip execution
      index = 1
    }

    const innerClosure: EVMClosure = {}
    const closures = [innerClosure, ...outerClosures]

    while (index < tokens.length - 1) {
      index++
      let token = tokens[index]
      const context = contexts.at(-1)
      const errorData = {
        closures,
        index,
        token: tokens[index],
        contexts,
      }

      const contextMarker = parseEVMContextMarker(token)
      const shouldProcessContextMarker = (
        // Process a context marker if it exists...
        contextMarker
        && (
          // ...and the current context is not a callback (because the tokens inside a callback
          // are parsed upon execution of the callback)...
          context?.type !== 'callback'
          || (
            // ...unless the context marker is `]]`, indicating the end of the callback
            // NOTE: this logic does not allow for nested callbacks
            contextMarker.type === 'callback'
            && contextMarker.position === 'end'
          )
        )
      )

      if (shouldProcessContextMarker) {
        const closeContext = (context: EVMContext, isSelfClosing = false) => {
          // Context was correctly opened then closed
          let finalValue = finalizeEVMContext(context, closures)

          if (context.type === 'string' && !isSelfClosing) {
            finalValue += ` ${token.slice(0, -1)}`
          }

          contexts.pop()

          const outerContext = contexts.at(-1)

          if (outerContext?.type === 'list') {
            // When creating a list within a list, do not place the inner list on
            // the stack; append it to the outer list instead
            outerContext.value.push(finalValue)
          } else {
            this.push(finalValue)
          }
        }

        if (contextMarker.position === 'start') {
          // New context was opened
          const newContext = createEVMContext(contextMarker.type)

          contexts.push(newContext)

          if (newContext.type === 'string') {
            newContext.value = token.slice(1) // Remove the leading quote mark

            // Handle one-word strings
            if (newContext.value.endsWith('\'')) {
              newContext.value = newContext.value.slice(0, -1)
              closeContext(newContext, true)
            }
          }

          continue
        } else if (contextMarker.type !== context?.type) {
          // Context was closed without being opened
          throw new EVMError(`Unexpected ${token} without matching start`, errorData)
        } else {
          closeContext(context)
          continue
        }
      } else {
        switch (context?.type) {
          case 'list': {
            const value = this.parseValue(token, closures)

            if (value !== undefined) {
              context.value.push(value)
            } else {
              throw new EVMError(`Expected a value for a list, got ${token}`, errorData)
            }

            continue
          }
          case 'callback': {
            context.tokens.push(token)
            continue
          }
          case 'string': {
            context.value += ` ${token}`
            continue
          }
        }
      }

      const isKeepMode = token.startsWith('~')

      if (isKeepMode) {
        token = token.slice(1)
      }

      switch (token) {
        case '+':
          this.push(this.num() + this.num())
          break
        case '-': {
          const b = this.num(), a = this.num()
          this.push(a - b)
          break
        }
        case '*':
          this.push(this.num() * this.num())
          break
        case '/': {
          const b = this.num(), a = this.num()
          this.push(a / b)
          break
        }
        case '==': {
          this.push(this.num() === this.num())
          break
        }
        case 'pop':
          this.pop()
          break
        case 'dup': {
          const value = this.pop()
          this.push(value)
          this.push(value)
          break
        }
        case 'swap': {
          const a = this.pop()
          const b = this.pop()
          this.push(a)
          this.push(b)
          break
        }
        case 'apply2': {
          const cbB = this.callback()
          const cbA = this.callback()
          const value = this.pop()

          this.push(value)
          this.execute(cbA.script, closures)
          this.push(value)
          this.execute(cbB.script, closures)
          break
        }
        case 'if?': {
          const value = this.pop()
          let truthy = false

          if (Array.isArray(value) && value.length > 0) {
            truthy = true
          } else if (typeof value === 'object') {
            truthy = true
          }

          if (typeof value === 'number' && value > 0) {
            truthy = true
          }

          if (value === true) {
            truthy = true
          }

          if (!truthy) {
            index = getElseOrEndToken(tokens, index, token)
          }

          break
        }
        case 'else': {
          index = getEndTokenIndex(tokens, index, token)
          break
        }
        case 'var':
        case 'let':
        case 'const': {
          const isGlobal = token === 'var' || token === 'const'
          let varName = tokens[++index]
          let defaultValue: EVMType = 0

          if (!varName) {
            throw new EVMError(`Expected a variable name after ${token}`, errorData)
          }

          if (varName.endsWith('!')) {
            varName = varName.slice(0, -1)
            defaultValue = this.pop()
          }

          if ((ENO_WORDS as string[]).includes(varName)) {
            throw new EVMError(`${varName} is a reserved word`, errorData)
          }

          if (isGlobal) {
            this.variables[varName] = defaultValue

            if (token === 'const') {
              this.constants.push(varName)
            }
          } else {
            innerClosure[varName] = defaultValue
          }

          break
        }
        case 'fn': {
          const fnName = tokens[++index]
          const fnStartIndex = index + 1

          if (!fnName.endsWith('()')) {
            throw new EVMError(`Function ${fnName} must end in ()`, errorData)
          }

          index = getEndTokenIndex(tokens, index, token)
          this.functions[fnName] = tokens.slice(fnStartIndex, index).join(' ')

          break
        }
        case 'tup': {
          const tupName = tokens[++index]

          if (!tupName.endsWith('{}')) {
            throw new EVMError(`Tuple ${tupName} must end in {}`, errorData)
          }

          let prop: string | undefined
          const tuple: EVMTupleBlueprint = {
            [TUPLE_ORDER]: [],
          }

          while (true) {
            const subtoken = tokens[++index]

            if (subtoken === 'end') {
              break
            }

            if (prop === undefined) {
              if (!subtoken.startsWith('.')) {
                throw new EVMError(`Expected tuple ${tupName} property ${subtoken} to start with a "."`, errorData)
              }

              prop = subtoken.slice(1)
              tuple[TUPLE_ORDER].push(prop)
            } else {
              const value = this.parseValue(subtoken, closures)

              if (value === undefined) {
                throw new EVMError(`Expected value for tuple ${tupName} property ${subtoken}, got ${subtoken}`, errorData)
              }

              tuple[prop] = value
              prop = undefined
            }
          }

          this.tuples[tupName] = tuple
          break
        }
        case 'end': {
          break
        }
        case 'debug': {
          console.log({
            variables: this.variables,
            functions: this.functions,
            tuples: this.tuples,
            closures,
          })
          debugger
          break
        }
        case 'index': {
          const index = this.num()
          const list = this.list()

          if (isKeepMode) {
            this.push(list)
          }

          this.push(list[index] ?? 0)
          break
        }
        case 'length': {
          const list = this.list()

          if (isKeepMode) {
            this.push(list)
          }

          this.push(list.length)
          break
        }
        case 'has': {
          const needle = this.pop()
          const list = this.list()

          if (isKeepMode) {
            this.push(list)
          }

          this.push(list.includes(needle))
          break
        }
        case 'concat': {
          const b = this.list()
          const a = this.list()

          this.push([
            ...a,
            ...b,
          ])
          break
        }
        case 'append': {
          const value = this.pop()
          const list = this.list()

          this.push([
            ...list,
            value,
          ])
        }
        case 'range': {
          const to = this.num()
          const from = this.num()

          this.push(
            Array.from({ length: to - from + 1 }, (_, index) => from + index),
          )
          break
        }
        case 'is-num': {
          const value = this.pop()

          if (isKeepMode) {
            this.push(value)
          }

          this.push(typeof value === 'number')

          break
        }
        case 'not': {
          const value = this.pop()

          if (typeof value !== 'boolean') {
            throw new EVMError(`Expected a boolean, got ${getEVMType(value)}`, errorData)
          }

          this.push(!value)

          break
        }
        case 'map':
        case 'each': {
          const callback = this.callback()
          const newList: EVMType[] = []

          this.list().forEach(item => {
            this.push(item)
            this.execute(callback.script, closures)
            if (token === 'map') {
              newList.push(this.pop())
            }
          })

          if (token === 'map') {
            this.push(newList)
          }
          break
        }
        case 'call': {
          this.execute(this.callback().script, closures)
          break
        }
        default:
          if (token.startsWith('.')) {
            let propName = token.slice(1)

            if (propName.endsWith('!')) {
              propName = propName.slice(0, -1)
              const propValue = this.pop()
              const tuple = this.tupleWithProp(propName)

              this.push({
                ...tuple,
                [propName]: propValue,
              })
            } else {
              const tuple = this.tupleWithProp(propName)

              if (isKeepMode) {
                this.push(tuple)
              }

              this.push(tuple[propName])
            }
          } else if (token.endsWith('!')) {
            const varName = token.slice(0, -1)

            if (this.isConstantVariable(varName)) {
              throw new EVMError(`Cannot reassign constant ${varName}`, errorData)
            }

            const variable = resolveVariable(varName, closures)

            if (!variable) {
              throw new EVMError(`Cannot assign to unknown variable ${varName}`, errorData)
            }

            closures[variable.index][varName] = this.pop()
          } else if (token.endsWith('()')) {
            this.callFunction(token)
          } else if (token.endsWith('{}')) {
            if (token in this.tuples) {
              const blueprint = this.tuples[token]
              const tuple: EVMTuple = {
                [TUPLE_TYPE]: token,
              }

              blueprint[TUPLE_ORDER].slice().reverse().forEach(key => {
                tuple[key] = this.pop()
              })

              this.push(tuple)
            }
          } else if (token.endsWith('{->}')) {
            const tupleName = token.slice(0, -4) + '{}'
            const blueprint = this.tuples[tupleName]
            const tuple: EVMTuple = {
              [TUPLE_TYPE]: tupleName,
            }

            blueprint[TUPLE_ORDER].forEach(key => {
              tuple[key] = blueprint[key]
            })

            this.push(tuple)
          } else {
            const value = this.parseValue(token, closures)

            if (value !== undefined) {
              this.push(value)
            } else {
              debugger
              throw new EVMError(`Unknown word ${token}`, errorData)
            }
          }
      }
    }

    return this.stack.map(stringifyEVMValue).join(' ')
  }

  /**
   * Parse a token that could be a value (e.g. a number or boolean), or a variable that references
   * a value.
   * @param token Token to parse.
   * @param closure The current closure.
   * @returns A resolved value, or `undefined` if no value could be resolved. This happens if the
   * token can't be parsed as a scalar, and no variable exists matching its name.
   */
  private parseValue(token: string, closures: EVMClosure[]): EVMType | undefined {
    if (token.match(/^\-?\d+$/)) {
      return Number.parseInt(token, 10)
    }

    if (token.startsWith('0x')) {
      return Number.parseInt(token.slice(2), 16)
    }

    if (token === ':true') {
      return true
    }

    if (token === ':false') {
      return false
    }

    return resolveVariable(token, closures)?.value
  }

  private pop(): EVMType {
    const value = this.stack.pop()

    if (value === undefined) {
      throw new Error('Stack underflow')
    }

    return value
  }

  private push(value: EVMType) {
    this.stack.push(value)
  }

  private num(): number {
    const value = this.pop()

    if (typeof value === 'number') {
      return value
    }

    throw new Error(`Expected number, got ${getEVMType(value)}`)
  }

  private list(): EVMType[] {
    const value = this.pop()

    if (Array.isArray(value)) {
      return value
    }

    throw new Error(`Expected list, got ${getEVMType(value)}`)
  }

  private tupleWithProp(key: string): EVMTuple {
    const value = this.pop()

    if (typeof value === 'object' && TUPLE_TYPE in value) {
      if (key in value) {
        return value
      }

      throw new Error(`Tuple ${value[TUPLE_TYPE]} does not have property ${key}`)
    }

    throw new Error(`Expected tuple, got ${getEVMType(value)}`)
  }

  private callback(): EVMCallback {
    const value = this.pop()

    if (typeof value === 'object' && EVM_CALLBACK in value) {
      return value
    }

    throw new Error(`Expected callback, got ${getEVMType(value)}`)
  }

  private isConstantVariable(varName: string) {
    return varName in this.variables && this.constants.includes(varName)
  }

  private callFunction(funcName: string) {
    if (funcName in this.syscalls) {
      try {
        this.syscalls[funcName](this.syscallArgs)
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : '(unknown error)'

        throw new Error(`In syscall ${funcName}: ${message}`)
      }
    } else if (funcName in this.functions) {
      this.execute(this.functions[funcName])
    } else {
      throw new Error(`Unknown function ${funcName}`)
    }
  }
}
