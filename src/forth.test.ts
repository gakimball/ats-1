import test, { ExecutionContext } from 'ava'
import { ForthMachine } from './forth'

const assert = (input: string, expected: unknown[]) => (t: ExecutionContext) => {
  const forth = new ForthMachine()
  forth.execute(input)
  t.deepEqual(forth.getStack(), expected)
}

test('+', assert('1 2 +', [3]))
