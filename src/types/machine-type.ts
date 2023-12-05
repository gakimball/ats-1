export const TUPLE_TYPE = Symbol('TUPLE_TYPE')

export const EVM_CALLBACK = Symbol('EVM_CALLBACK')

export interface EVMClosure {
  [varName: string]: EVMType;
}

export type EVMCallback = {
  [EVM_CALLBACK]: true;
  script: string;
  closure: EVMClosure;
}

export type EVMScalar = number | boolean

export type EVMTuple = {
  [TUPLE_TYPE]: string;
  [K: string]: EVMType
}

export type EVMType = EVMScalar | EVMType[] | EVMTuple | EVMCallback
