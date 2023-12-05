import { EVMType, TUPLE_TYPE } from '../types/machine-type';

export const stringifyEVMValue = (value: EVMType): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyEVMValue).join(', ')}]`
  }

  if (typeof value === 'object') {
    if (TUPLE_TYPE in value) {
      const name = value[TUPLE_TYPE].slice(0, -2)
      const props = Object.entries(value)
        .map(([key, value]) => `${key}:${stringifyEVMValue(value)}`)
        .join(', ')

      return `${name} { ${props} }`
    }

    return `callback:[ ${value.script} ]`
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return `:${value}`
}
