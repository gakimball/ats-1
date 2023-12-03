import test, { ExecutionContext } from 'ava'
import { EVM } from './evm'

const assert = (input: string, expected: unknown[]) => (t: ExecutionContext) => {
  const evm = new EVM()
  evm.execute(input)
  t.deepEqual(evm.getStack(), expected)
}

test('+', assert('1 2 +', [3]))
