import { EVMTuple, EVMType, TUPLE_TYPE } from '../types/machine-type';

export const createTuple = <T extends Record<string, EVMType>>(
  type: `${string}{}`,
  props: T,
): EVMTuple & T => ({
  [TUPLE_TYPE]: type,
  ...props,
})
