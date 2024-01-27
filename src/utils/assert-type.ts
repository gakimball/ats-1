import { EVMTuple, EVMType, TUPLE_TYPE } from '../types/machine-type'
import { getEVMType } from './get-evm-type'

export const assertType = {
  num: (value: EVMType): number => {
    if (typeof value === 'number') {
      return value
    }

    throw new Error(`Syscall error: expected a number, got ${getEVMType(value)}`)
  },
  int: (value: EVMType): number => {
    if (typeof value === 'number') {
      return Math.round(value)
    }

    throw new Error(`Syscall error: expected a number, got ${getEVMType(value)}`)
  },
  list: (value: EVMType): EVMType[] => {
    if (Array.isArray(value)) {
      return value
    }

    throw new Error(`Syscall error: expected a list, got ${getEVMType(value)}`)
  },
  tuple: <T>(type: `${string}{}`, value: EVMType): EVMTuple & T => {
    if (typeof value === 'object' && TUPLE_TYPE in value && value[TUPLE_TYPE] === type) {
      return value as EVMTuple & T
    }

    throw new Error(`Syscall error: expected ${type}, got ${getEVMType(value)}`)
  },
  string: (value: EVMType): string => {
    if (typeof value !== 'string') {
      throw new Error(`Syscall error, expected a string, got ${getEVMType(value)}`)
    }

    return value
  },
}
