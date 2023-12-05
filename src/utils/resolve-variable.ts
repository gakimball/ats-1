import { EVMClosure, EVMType } from '../types/machine-type';

/**
 * Given a list of closures, find the first closure containing the given variable name.
 * @param varName Name of variable to find.
 * @param closures List of closures to inspect, in order.
 * @returns If found, the resolved value and the index of the closure.
 */
export const resolveVariable = (varName: string, closures: EVMClosure[]): {
  index: number;
  value: EVMType;
} | undefined => {
  for (const closure of closures) {
    if (varName in closure) {
      return {
        index: closures.indexOf(closure),
        value: closure[varName],
      }
    }
  }
}
