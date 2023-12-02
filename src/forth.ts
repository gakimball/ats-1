const RESERVED_WORDS = [
  '+',
  '-',
  '*',
  '/',
  'dup',
]
const TUPLE_TYPE = Symbol('TUPLE_TYPE')
const TUPLE_ORDER = Symbol('TUPLE_ORDER')

type ForthMachineScalar = number | boolean
type ForthMachineTuple = {
  [TUPLE_TYPE]: string;
  [K: string]: ForthMachineType
}
type ForthMachineType = ForthMachineScalar | ForthMachineType[] | ForthMachineTuple

interface ForthMachineSyscallArgs {
  pop: () => ForthMachineType;
  push: (value: ForthMachineType) => void;
  variable: (name: string) => ForthMachineType;
  num: (value: ForthMachineType) => number;
  execute: (script: string) => void;
  tuple: (type: string, value: ForthMachineType) => ForthMachineTuple;
}

export type ForthMachineSyscall = (args: ForthMachineSyscallArgs) => void

type ForthMachineStackFrame = {
  type: 'list',
  value: ForthMachineType[];
}

interface ForthMachineTupleBlueprint {
  [TUPLE_ORDER]: string[];
  [K: string]: ForthMachineType;
}

export class ForthMachine {
  private static getElseOrEnd(tokens: string[], index: number): number {
    let nestedIfCount = 0

    while (index < tokens.length - 1) {
      const token = tokens[++index]

      switch (token) {
        case 'if?':
          nestedIfCount++
          break
        case 'else':
        case 'end':
          if (nestedIfCount === 0) {
            return index
          }
          if (token === 'end') {
            nestedIfCount--
          }
          break
      }
    }

    throw new Error('Could not find matching else/end for if')
  }

  private static getEnd(tokens: string[], index: number): number {
    let nestedIfCount = 0

    while (index < tokens.length - 1) {
      const token = tokens[++index]

      switch (token) {
        case 'if?':
          nestedIfCount++
          break
        case 'end':
          if (nestedIfCount === 0) {
            return index
          }
          nestedIfCount--
      }
    }

    throw new Error('Could not find matching end for else')
  }

  private static formatStackValue(value: ForthMachineType): string {
    if (Array.isArray(value)) {
      return `[${value.map(ForthMachine.formatStackValue).join(', ')}]`
    }

    if (typeof value === 'object') {
      const name = value[TUPLE_TYPE].slice(0, -1)
      const props = Object.entries(value)
        .map(([key, value]) => `${key}:${ForthMachine.formatStackValue(value)}`)
        .join(', ')

      return `${name} ${props} }`
    }

    if (typeof value === 'number') {
      return String(value)
    }

    return `:${value}`
  }

  private readonly stack: Array<ForthMachineType> = []

  private readonly variables: {
    [name: string]: ForthMachineType;
  } = {}

  private readonly functions: {
    [name: string]: string;
  } = {}

  private readonly tuples: {
    [name: string]: {
      [TUPLE_ORDER]: string[];
      [key: string]: ForthMachineType;
    };
  } = {}

  private syscallArgs: ForthMachineSyscallArgs = {
    pop: () => this.pop(),
    push: value => this.push(value),
    variable: name => {
      if (name in this.variables) {
        return this.variables[name]
      }

      throw new Error(`Syscall error: no variable named ${name}`)
    },
    num: value => {
      if (typeof value === 'number') {
        return value
      }

      throw new Error(`Expected a number, got ${typeof value}`)
    },
    tuple: (type, value) => {
      if (typeof value === 'object' && TUPLE_TYPE in value && value[TUPLE_TYPE] === type) {
        return value
      }

      throw new Error(`Expected ${type}, got ${typeof value}`)
    },
    execute: script => this.execute(script),
  }

  constructor(
    private readonly syscalls: {
      [name: string]: ForthMachineSyscall
    } = {}
  ) {}

  getStack() {
    return [...this.stack]
  }

  execute(input: string) {
    const tokens = input.trim().replace(/\([^)]+\)/g, '').split(/\s+/)
    let index = -1
    const stack: ForthMachineStackFrame[] = []

    if (tokens.length === 1 && tokens[0] === '') {
      // Skip execution
      index = 1
    }

    const closure: {
      [varName: string]: ForthMachineType;
    } = {}

    while (index < tokens.length - 1) {
      index++
      let token = tokens[index]
      const frame = stack.at(-1)

      if (frame?.type === 'list') {
        if (token === ']') {
          this.push(frame.value)
          stack.pop()
        } else {
          const value = this.parseValue(token, closure)

          if (value !== undefined) {
            frame.value.push(value)
          } else {
            throw new Error(`Expected a value for a list, got ${token}`)
          }
        }

        continue
      }

      // const res = /^(?<keep>~?)(?<access>\.?)(?<word>.+?)(?<assign>!?)$/.exec(token)
      // const match = {
      //   keep: res?.groups?.keep !== '',
      //   access: res?.groups?.access !== '',
      //   assign: res?.groups?.assign !== '',
      // }
      // token = res?.groups?.word ?? ''

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
            index = ForthMachine.getElseOrEnd(tokens, index)
          }

          break
        }
        case 'else': {
          index = ForthMachine.getEnd(tokens, index)
          break
        }
        case 'var':
        case 'let': {
          const isGlobal = token === 'var'
          let varName = tokens[++index]
          let defaultValue: ForthMachineType = 0

          if (!varName) {
            throw new Error(`Expected a variable name after ${token}`)
          }

          if (varName.endsWith('!')) {
            varName = varName.slice(0, -1)
            defaultValue = this.pop()
          }

          if (RESERVED_WORDS.includes(varName)) {
            throw new Error(`${varName} is a reserved word`)
          }

          if (isGlobal) {
            this.variables[varName] = defaultValue
          } else {
            closure[varName] = defaultValue
          }

          break
        }
        case 'fn': {
          const fnName = tokens[++index]
          const fnStartIndex = index + 1

          if (!fnName.endsWith('()')) {
            throw new Error(`Function ${fnName} must end in ()`)
          }

          index = ForthMachine.getEnd(tokens, index)
          this.functions[fnName] = tokens.slice(fnStartIndex, index).join(' ')

          break
        }
        case 'tup': {
          const tupName = tokens[++index]

          if (!tupName.endsWith('{}')) {
            throw new Error(`Tuple ${tupName} must end in {}`)
          }

          let prop: string | undefined
          const tuple: ForthMachineTupleBlueprint = {
            [TUPLE_ORDER]: [],
          }

          while (true) {
            const subtoken = tokens[++index]

            if (subtoken === 'end') {
              break
            }

            if (prop === undefined) {
              if (!subtoken.startsWith('.')) {
                throw new Error(`Expected tuple ${tupName} property ${subtoken} to start with a "."`)
              }

              prop = subtoken.slice(1)
              tuple[TUPLE_ORDER].push(prop)
            } else {
              const value = this.parseValue(subtoken, closure)

              if (value === undefined) {
                throw new Error(`Expected value for tuple ${tupName} property ${subtoken}, got ${subtoken}`)
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
          })
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
        case '[': {
          stack.push({
            type: 'list',
            value: [],
          })
          break
        }
        case ']': {
          throw new Error('No matching [ to go with ]')
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

            if (varName in this.variables) {
              this.variables[varName] = this.pop()
            } else {
              throw new Error(`Unknown variable ${varName}`)
            }
          } else if (token.endsWith('()')) {
            if (token in this.syscalls) {
              this.syscalls[token](this.syscallArgs)
            } else if (token in this.functions) {
              this.execute(this.functions[token])
            } else {
              throw new Error(`Unknown function ${token}`)
            }
          } else if (token.endsWith('{}')) {
            if (token in this.tuples) {
              const blueprint = this.tuples[token]
              const tuple: ForthMachineTuple = {
                [TUPLE_TYPE]: token,
              }

              blueprint[TUPLE_ORDER].slice().reverse().forEach(key => {
                tuple[key] = this.pop()
              })

              this.push(tuple)
            }
          } else {
            const value = this.parseValue(token, closure)

            if (value !== undefined) {
              this.push(value)
            } else {
              throw new Error(`Unknown word ${token}`)
            }
          }
      }
    }

    return this.stack.map(ForthMachine.formatStackValue).join(' ')
  }

  private parseValue(token: string, closure: {
    [varName: string]: ForthMachineType;
  }): ForthMachineType | undefined {
    if (token.match(/^\d+$/)) {
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

    if (token in closure) {
      return closure[token]
    }

    if (token in this.variables) {
      return this.variables[token]
    }
  }

  private pop(): ForthMachineType {
    const value = this.stack.pop()

    if (value === undefined) {
      throw new Error('Stack underflow')
    }

    return value
  }

  private push(value: ForthMachineType) {
    this.stack.push(value)
  }

  private num(): number {
    const value = this.pop()

    if (typeof value === 'number') {
      return value
    }

    throw new Error(`Expected number, got ${typeof value}`)
  }

  private list(): ForthMachineType[] {
    const value = this.pop()

    if (Array.isArray(value)) {
      return value
    }

    throw new Error(`Expected list, got ${typeof value}`)
  }

  private tupleWithProp(key: string): ForthMachineTuple {
    const value = this.pop()

    if (typeof value === 'object' && TUPLE_TYPE in value) {
      if (key in value) {
        return value
      }

      throw new Error(`Tuple ${value[TUPLE_TYPE]} does not have property ${key}`)
    }

    throw new Error(`Expected tuple, got ${typeof value}`)
  }
}
