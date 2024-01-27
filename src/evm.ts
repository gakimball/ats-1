import { EVMCallback, EVMClosure, EVMTuple, EVMType, EVM_CALLBACK, TUPLE_TYPE } from './types/machine-type';
import { EVMError, EVMErrorData } from './utils/evm-error';
import { getElseOrEndToken } from './utils/get-else-or-end-token';
import { getEndTokenIndex } from './utils/get-end-token';
import { getEVMType } from './utils/get-evm-type';
import { resolveVariable } from './utils/resolve-variable';
import { stringifyEVMValue } from './utils/stringify-evm-value';
import { ENO_WORDS } from './utils/words';
import { CORE_WORDS } from './utils/core-words';
import { assertType } from './utils/assert-type';
import { parseValue } from './utils/parse-value';

const TUPLE_ORDER = Symbol('TUPLE_ORDER')

interface EVMSyscallArgs {
  pop: () => EVMType;
  push: (value: EVMType) => void;
  variable: (name: string) => EVMType;
  num: (value: EVMType) => number;
  int: (value: EVMType) => number;
  list: (value: EVMType) => EVMType[];
  execute: (script: string) => void;
  tuple: <T>(type: `${string}{}`, value: EVMType) => EVMTuple & T;
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
    ...assertType,
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

      throw new EVMError(`Syscall error: no variable named ${name}`, this.errorData)
    },
    /**
     * Run the given script within the machine's context.
     * @returns The current stack formatted as a string.
     */
    execute: script => this.execute(script),
  }

  private errorData: EVMErrorData = {
    closures: [],
    index: 0,
    token: '',
    script: '',
    callStack: [],
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

  setVariable(name: string, value: EVMType) {
    if (!(name in this.variables)) {
      throw new EVMError(`Variable ${name} is not defined`, this.errorData)
    }

    if (this.isConstantVariable(name)) {
      throw new EVMError(`Variable ${name} is constant`, this.errorData)
    }

    this.variables[name] = value
  }

  execute(
    input: string,
    outerClosures: EVMClosure[] = [this.variables],
    callStack = ['(root)'],
    appliedValues?: EVMType[],
  ) {
    const tokens = input.trim().replace(/\([^)]+\)/g, '').split(/\s+/)
    let index = -1
    let appliedValueIndex = 0

    if (tokens.length === 1 && tokens[0] === '') {
      // Skip execution
      index = 1
    }

    const innerClosure: EVMClosure = {}
    const closures = [innerClosure, ...outerClosures]

    while (index < tokens.length - 1) {
      index++
      let token = tokens[index]

      // TODO: How to prevent this?
      if (token === '') {
        continue
      }

      this.errorData = {
        closures,
        index,
        token: tokens[index],
        script: input,
        callStack,
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
        case 'if?':
        case '~if?': {
          const isKeepMode = token.startsWith('~')

          if (isKeepMode) {
            this.execute('dup', undefined, [...callStack, token])
          }

          this.execute('is-truthy', closures, [...callStack, token])

          if (this.pop() === false) {
            if (isKeepMode) {
              this.pop()
            }

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
            throw new EVMError(`Expected a variable name after ${token}`, this.errorData)
          }

          if (varName.endsWith('!')) {
            varName = varName.slice(0, -1)
            defaultValue = this.pop()
          }

          if ((ENO_WORDS as string[]).includes(varName)) {
            throw new EVMError(`${varName} is a reserved word`, this.errorData)
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
            throw new EVMError(`Function ${name} must end in ()`, this.errorData)
          }

          if (!isFn && !this.isStdLibPhase) {
            throw new EVMError(`"word" is a reserved keyword`, this.errorData)
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
            throw new EVMError(`Tuple ${tupName} must end in {}`, this.errorData)
          }

          // let prop: string | undefined
          const tuple: EVMTupleBlueprint = {
            [TUPLE_ORDER]: [],
          }

          while (true) {
            const propToken = tokens[++index]

            if (propToken === 'end') {
              break
            }

            if (!propToken.startsWith('.')) {
              throw new EVMError(`Expected tuple ${tupName} property ${propToken} to start with a "."`, this.errorData)
            }

            const propName = propToken.slice(1)
            tuple[TUPLE_ORDER].push(propName)

            const valueToken = tokens[index + 1]

            if (valueToken.startsWith('.') || valueToken === 'end') {
              // Use the default default value
              tuple[propName] = 0
            } else {
              const { value, newIndex } = parseValue(tokens, index + 1, closures)
              index = newIndex

              if (value === undefined) {
                throw new EVMError(`Expected value for tuple ${tupName} property ${propToken}, got ${propToken}`, this.errorData)
              }

              tuple[propName] = value
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
            stack: this.stack,
          })
          debugger
          break
        }
        case 'log': {
          const value = this.pop()
          console.log(stringifyEVMValue(value))
          this.push(value)
          break
        }
        case 'get': {
          const prop = this.pop()
          const object = this.pop()
          let value

          if (typeof prop === 'number') {
            if (!Array.isArray(object)) {
              throw new EVMError(`Cannot use a number to index a ${getEVMType(object)}`, this.errorData)
            }

            value = object[prop]

            if (value === undefined) {
              throw new EVMError(`List index ${prop} is out of bounds (length: ${object.length})`, this.errorData)
            }
          }

          if (typeof prop === 'string') {
            if (typeof object !== 'object' || !(TUPLE_TYPE in object)) {
              throw new EVMError(`Cannot use a string to index a ${getEVMType(object)}`, this.errorData)
            }

            value = object[prop]

            if (value === undefined) {
              throw new EVMError(`Property ${prop} does not exist on tuple ${object[TUPLE_TYPE]}`, this.errorData)
            }
          }

          this.push(value ?? 0)
          break
        }
        case 'set': {
          // TODO: rework order to mimic the setter shorthand
          // Should be ( object value prop -- object' )
          const value = this.pop()
          const prop = this.pop()
          const object = this.pop()

          if (typeof prop === 'number') {
            if (!Array.isArray(object)) {
              throw new EVMError(`Cannot use a number to index a ${getEVMType(object)}`, this.errorData)
            }

            const next = [...object]
            next[prop] = value
            this.push(next)
          }

          if (typeof prop === 'string') {
            if (typeof object !== 'object' || !(TUPLE_TYPE in object)) {
              throw new EVMError(`Cannot use a string to index a ${getEVMType(object)}`, this.errorData)
            }

            if (!(prop in object)) {
              throw new EVMError(`"${prop} is not a property of tuple ${object[TUPLE_TYPE]}"`, this.errorData)
            }

            const next = {...object}
            next[prop] = value
            this.push(next)
          }

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
        case 'has-prop': {
          const needle = this.pop()
          const tuple = this.anyTuple()

          this.push(String(needle) in tuple)
          break
        }
        case 'reverse': {
          const list = this.list()

          this.push(list.reverse())

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
        case 'props': {
          const tuple = this.anyTuple()
          const blueprint = this.tuples[tuple[TUPLE_TYPE]]

          this.push(blueprint[TUPLE_ORDER])

          break
        }
        case '->string': {
          this.push(String(this.num()))
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

          if (Array.isArray(value)) {
            truthy = value.length > 0
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
            throw new EVMError(`Expected a boolean, got ${getEVMType(value)}`, this.errorData)
          }

          this.push(!value)

          break
        }
        case 'each': {
          const callback = this.callback()

          this.list().forEach(item => {
            this.push(item)
            this.push(callback)
            this.execute('call', undefined, [...callStack, 'each'])
          })

          break
        }
        case 'call': {
          const callback = this.callback()
          const appliedValues = Array
            .from({ length: callback.placeholders }, () => this.pop())
            .reverse()

          this.execute(callback.script, callback.closures, [...callStack, '(callback)'], appliedValues)

          break
        }
        case 'recurse': {
          index = 0
          break
        }
        case '_': {
          if (!appliedValues) {
            throw new EVMError('Cannot use _ outside of a callback', this.errorData)
          }

          this.push(appliedValues[appliedValueIndex])
          appliedValueIndex += 1

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
              throw new EVMError(`Cannot reassign constant ${varName}`, this.errorData)
            }

            const variable = resolveVariable(varName, closures)

            if (!variable) {
              throw new EVMError(`Cannot assign to unknown variable ${varName}`, this.errorData)
            }

            closures[variable.index][varName] = this.pop()
          } else if (token.endsWith('()') || token in this.words) {
            this.callFunction(token, callStack)
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
            const { value, newIndex } = parseValue(tokens, index, closures)
            index = newIndex

            if (value !== undefined) {
              this.push(value)
            } else {
              debugger
              throw new EVMError(`Unknown word ${token}`, this.errorData)
            }
          }
      }
    }

    return this.stack.map(stringifyEVMValue).join(' ')
  }

  private pop(): EVMType {
    const value = this.stack.pop()

    if (value === undefined) {
      throw new EVMError('Stack underflow', this.errorData)
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

    throw new EVMError(`Expected number, got ${getEVMType(value)}`, this.errorData)
  }

  private list(): EVMType[] {
    const value = this.pop()

    if (Array.isArray(value)) {
      return value
    }

    throw new EVMError(`Expected list, got ${getEVMType(value)}`, this.errorData)
  }

  private anyTuple(): EVMTuple {
    const value = this.pop()

    if (typeof value === 'object' && TUPLE_TYPE in value) {
      return value
    }

    throw new EVMError(`Expected tuple, got ${getEVMType(value)}`, this.errorData)
  }

  private tupleWithProp(key: string): EVMTuple {
    const value = this.pop()

    if (typeof value === 'object' && TUPLE_TYPE in value) {
      if (key in value) {
        return value
      }

      throw new EVMError(`Tuple ${value[TUPLE_TYPE]} does not have property ${key}`, this.errorData)
    }

    throw new EVMError(`Expected tuple, got ${getEVMType(value)}`, this.errorData)
  }

  private callback(): EVMCallback {
    const value = this.pop()

    if (typeof value === 'object' && EVM_CALLBACK in value) {
      return value
    }

    throw new EVMError(`Expected callback, got ${getEVMType(value)}`, this.errorData)
  }

  private isConstantVariable(varName: string) {
    return varName in this.variables && this.constants.includes(varName)
  }

  private callFunction(funcName: string, callStack: string[]) {
    if (funcName in this.words) {
      this.execute(this.words[funcName], undefined, [...callStack, funcName])
      return
    }

    if (funcName in this.syscalls) {
      try {
        this.syscalls[funcName](this.syscallArgs)
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : '(unknown error)'

        throw new EVMError(`In syscall ${funcName}: ${message}`, this.errorData)
      }
      return
    }

    if (funcName in this.functions) {
      const { contents, closures } = this.functions[funcName]
      this.execute(contents, closures, [...callStack, funcName])
      return
    }

    throw new EVMError(`Unknown function ${funcName}`, this.errorData)
  }
}
