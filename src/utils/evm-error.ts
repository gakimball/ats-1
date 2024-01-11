import { EVMClosure } from '../types/machine-type'

export interface EVMErrorData {
  closures: EVMClosure[];
  index: number;
  token: string;
  script: string;
  callStack: string[];
}

export class EVMError extends Error {
  constructor(
    public message: string,
    public data: EVMErrorData
  ) {
    super(message)
  }
}
