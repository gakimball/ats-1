import { EVMCallback, EVMClosure, EVMTuple, EVMType, EVM_CALLBACK, TUPLE_TYPE } from './types/machine-type';
import { EVMError } from './utils/evm-error';
import { getElseOrEndToken } from './utils/get-else-or-end-token';
import { getEndTokenIndex } from './utils/get-end-token';
import { getEVMType } from './utils/get-evm-type';
import { resolveVariable } from './utils/resolve-variable';
import { stringifyEVMValue } from './utils/stringify-evm-value';
import { ENO_WORDS } from './utils/words';
import { CORE_WORDS } from './utils/core-words';

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

  private readonly isStdLibPhase: boolean = true

  private readonly words: {
    [name: string]: string;
  } = {}

  /**
   * Map of user-defined functions; each value is the function body.
   */
  private readonly functions: {
    [name: string]: {
      contents: string;
      closures: EVMClosure[];
    };
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
  ) {
    this.execute(CORE_WORDS)
    this.isStdLibPhase = false
  }

  getStack() {
    return [...this.stack]
  }

  execute(input: string, outerClosures: EVMClosure[] = [this.variables]) {
    const tokens = input.trim().replace(/\([^)]+\)/g, '').split(/\s+/)
    let index = -1

    if (tokens.length === 1 && tokens[0] === '') {
      // Skip execution
      index = 1
    }

    const innerClosure: EVMClosure = {}
    const closures = [innerClosure, ...outerClosures]

    while (index < tokens.length - 1) {
      index++
      let token = tokens[index]

      console.log(this.stack.map(v => stringifyEVMValue(v)), token)

      // TODO: How to prevent this?
      if (token === '') {
        continue
      }

      const errorData = {
        closures,
        index,
        token: tokens[index],
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
        case '//': {
          const b = this.num(), a = this.num()
          this.push(Math.floor(a / b))
          break
        }
        case '==': {
          this.push(this.num() === this.num())
          break
        }
        case '%': {
          const b = this.num(), a = this.num()
          this.push(a % b)
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
        case 'dupd': {
          const top = this.pop()
          const value = this.pop()
          this.push(value)
          this.push(value)
          this.push(top)
          break
        }
        case 'swap': {
          const a = this.pop()
          const b = this.pop()
          this.push(a)
          this.push(b)
          break
        }
        case 'if?': {
          this.execute('is-truthy', closures)

          if (this.pop() === false) {
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
        case 'fn':
        case 'word': {
          const isFn = token === 'fn'
          const name = tokens[++index]
          const startIndex = index + 1

          if (isFn && !name.endsWith('()')) {
            throw new EVMError(`Function ${name} must end in ()`, errorData)
          }

          if (!isFn && !this.isStdLibPhase) {
            throw new EVMError(`"word" is a reserved keyword`, errorData)
          }

          index = getEndTokenIndex(tokens, index, token)
          const contents = tokens.slice(startIndex, index).join(' ')

          if (isFn) {
            this.functions[name] = {
              contents,
              closures,
            }
          } else {
            this.words[name] = contents
          }

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
              const { value, newIndex } = this.parseValue(tokens, index, closures)
              index = newIndex

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
        case 'get': {
          const prop = this.pop()
          const object = this.pop()
          let value

          if (typeof prop === 'number') {
            if (!Array.isArray(object)) {
              throw new EVMError(`Cannot use a number to index a ${getEVMType(object)}`, errorData)
            }

            value = object[prop]
          }

          if (typeof prop === 'string') {
            if (typeof object !== 'object' || !(TUPLE_TYPE in object)) {
              throw new EVMError(`Cannot use a string to index a ${getEVMType(object)}`, errorData)
            }

            value = object[prop]
          }

          this.push(value ?? 0)
          break
        }
        case 'length': {
          const list = this.list()

          this.push(list.length)
          break
        }
        case 'has': {
          const needle = this.pop()
          const list = this.list()

          this.push(list.includes(needle))
          break
        }
        case 'append': {
          const value = this.pop()
          const list = this.list()

          this.push([
            ...list,
            value,
          ])
          break
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

          this.push(typeof value === 'number')

          break
        }
        case 'is-truthy': {
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

          this.push(truthy)

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
        case 'each': {
          const callback = this.callback()

          this.list().forEach(item => {
            this.push(item)
            this.execute(callback.script, closures)
          })

          break
        }
        case 'call': {
          const callback = this.callback()
          this.execute(callback.script, callback.closures)
          break
        }
        default:
          if (token.startsWith('.') || token.startsWith('~.')) {
            let propName = token.replace(/^~?\./, '')
            let tuple
            let value

            if (propName.endsWith('!')) {
              propName = propName.slice(0, -1)
              const propValue = this.pop()
              tuple = this.tupleWithProp(propName)

              value = {
                ...tuple,
                [propName]: propValue,
              }
            } else {
              tuple = this.tupleWithProp(propName)

              value = tuple[propName]
            }

            if (token.startsWith('~')) {
              this.push(tuple)
            }

            this.push(value)
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
          } else if (token.endsWith('()') || token in this.words) {
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
            const { value, newIndex } = this.parseValue(tokens, index, closures)
            index = newIndex

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
  private parseValue(
    tokens: string[],
    index: number,
    closures: EVMClosure[],
  ): {
    value: EVMType | undefined;
    newIndex: number;
  } {
    const token = tokens[index]

    if (token.match(/^\-?\d+(\.\d+)?$/)) {
      return {
        value: Number.parseFloat(token),
        newIndex: index,
      }
    }

    if (token.startsWith('0x')) {
      return {
        value: Number.parseInt(token.slice(2), 16),
        newIndex: index,
      }
    }

    if (token === ':true') {
      return {
        value: true,
        newIndex: index,
      }
    }

    if (token === ':false') {
      return {
        value: false,
        newIndex: index,
      }
    }

    if (token === '[') {
      let newIndex = index
      const values: EVMType = []

      while (++newIndex) {
        const nextToken = tokens[newIndex]

        if (nextToken === ']') {
          return {
            value: values,
            newIndex,
          }
        }

        const parsed = this.parseValue(tokens, newIndex, closures)
        newIndex = parsed.newIndex

        if (parsed.value === undefined) {
          throw new Error(`Cannot use ${tokens[newIndex]} in a list`)
        }

        values.push(parsed.value)
      }
    }

    if (token === '[[') {
      let stack = 0
      let inString = false
      let newIndex = index

      while (++newIndex) {
        const nextToken = tokens[newIndex]

        if (nextToken.startsWith("'") && !inString) {
          inString = true;
        }

        if (nextToken.endsWith("'") && inString) {
          inString = false;
        }

        if (inString) continue

        if (nextToken === '[[') {
          stack++
        } else if (nextToken === ']]') {
          stack--

          if (stack < 0) {
            return {
              value: {
                [EVM_CALLBACK]: true,
                script: tokens.slice(index + 1, newIndex).join(' '),
                closures,
              },
              newIndex,
            }
          }
        }
      }
    }

    if (token.startsWith("'")) {
      let newIndex = index

      do {
        const nextToken = tokens[newIndex]

        if (nextToken.endsWith("'")) {
          return {
            value: tokens.slice(index, newIndex + 1).join(' ').slice(1, -1),
            newIndex,
          }
        }
      } while (++newIndex)
    }

    return {
      value: resolveVariable(token, closures)?.value,
      newIndex: index,
    }
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
    if (funcName in this.words) {
      this.execute(this.words[funcName], [])
    } else if (funcName in this.syscalls) {
      try {
        this.syscalls[funcName](this.syscallArgs)
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : '(unknown error)'

        throw new Error(`In syscall ${funcName}: ${message}`)
      }
    } else if (funcName in this.functions) {
      const { contents, closures } = this.functions[funcName]

      this.execute(contents, closures)
    } else {
      throw new Error(`Unknown function ${funcName}`)
    }
  }
}
