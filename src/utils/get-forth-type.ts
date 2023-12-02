import { ForthMachineType, TUPLE_TYPE } from '../types/machine-type';

export const getForthType = (value: ForthMachineType) => {
  if (Array.isArray(value)) {
    return 'list'
  }

  switch (typeof value) {
    case 'object':
      return value[TUPLE_TYPE]
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
  }
}
