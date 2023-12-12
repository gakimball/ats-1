import { EVMType, TUPLE_TYPE } from '../types/machine-type';

export const stringifyEVMValue = (value: EVMType): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyEVMValue).join(', ')}]`
  }

  switch (typeof value) {
    case 'object': {
      if (TUPLE_TYPE in value) {
        const name = value[TUPLE_TYPE].slice(0, -2)
        const props = Object.entries(value)
          .map(([key, value]) => `${key}:${stringifyEVMValue(value)}`)
          .join(', ')

        return `${name} { ${props} }`
      }

      return `callback:[ ${value.script} ]`
    }
    case 'boolean':
      return `:${value}`
    case 'number':
      return String(value)
    case 'string':
      return `'${value}'`
  }
}
