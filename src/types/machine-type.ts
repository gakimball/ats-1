export const TUPLE_TYPE = Symbol('TUPLE_TYPE')

export type ForthMachineScalar = number | boolean
export type ForthMachineTuple = {
  [TUPLE_TYPE]: string;
  [K: string]: ForthMachineType
}
export type ForthMachineType = ForthMachineScalar | ForthMachineType[] | ForthMachineTuple
