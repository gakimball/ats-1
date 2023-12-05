import { EVMType, TUPLE_TYPE } from '../types/machine-type';

export const getEVMType = (value: EVMType) => {
  if (Array.isArray(value)) {
    return 'list'
  }

  switch (typeof value) {
    case 'object':
      if (TUPLE_TYPE in value) {
        return value[TUPLE_TYPE]
      }
      return 'callback'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
  }
}
