import { ForthMachineType, TUPLE_TYPE } from '../types/machine-type';

export const stringifyForthValue = (value: ForthMachineType): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyForthValue).join(', ')}]`
  }

  if (typeof value === 'object') {
    const name = value[TUPLE_TYPE].slice(0, -1)
    const props = Object.entries(value)
      .map(([key, value]) => `${key}:${stringifyForthValue(value)}`)
      .join(', ')

    return `${name} ${props} }`
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return `:${value}`
}
