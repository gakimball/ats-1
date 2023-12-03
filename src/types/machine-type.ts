export const TUPLE_TYPE = Symbol('TUPLE_TYPE')

export type EVMScalar = number | boolean
export type EVMTuple = {
  [TUPLE_TYPE]: string;
  [K: string]: EVMType
}
export type EVMType = EVMScalar | EVMType[] | EVMTuple
