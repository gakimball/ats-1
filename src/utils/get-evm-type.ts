import { EVMType, TUPLE_TYPE } from '../types/machine-type';

export const getEVMType = (value: EVMType) => {
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
