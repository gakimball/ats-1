import { EVMClosure } from '../types/machine-type'

export class EVMError extends Error {
  constructor(
    public message: string,
    public data: {
      closures: EVMClosure[];
      index: number;
      token: string;
    }
  ) {
    super(message)
  }
}
