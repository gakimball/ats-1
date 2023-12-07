import { describe, test, mock } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import { EVM } from './evm'
import { EVM_CALLBACK, TUPLE_TYPE } from './types/machine-type'

const assert = (input: string, expected: unknown[]) => () => {
  const evm = new EVM()
  evm.execute(input)
  deepStrictEqual(evm.getStack(), expected)
}

const mockTuple = `
  tup mock{}
    .value 0
  end

  0 mock{}
`

describe('Operators', () => {
  test('+', assert('1 2 +', [3]))
  test('-', assert('1 2 -', [-1]))
  test('*', assert('1 2 *', [2]))
  test('/', assert('1 2 /', [0.5]))
  test('== (true)', assert('1 1 ==', [true]))
  test('== (false)', assert('1 2 ==', [false]))
  test('not', assert(`:true not`, [false]))
})

describe('Stack words', () => {
  test('dup', assert('1 dup', [1, 1]))
  test('pop', assert('1 pop', []))
  test('swap', assert('1 2 swap', [2, 1]))
})

describe('List words', () => {
  test('index', assert('[ 1 2 ] 1 index', [2]))
  test('index (keep)', assert(`[ 1 2 ] 1 ~index`, [[1, 2], 2]))
  test('length', assert('[ 1 2 ] length', [2]))
  test('length (keep)', assert('[ 1 2 ] ~length', [[1, 2], 2]))
  test('concat', assert('[ 1 ] [ 2 ] concat', [[1, 2]]))
  test('range', assert('1 3 range', [[1, 2, 3]]))
  test('has (true)', assert('[ 1 2 ] 2 has', [true]))
  test('has (false)', assert('[ 1 2 ] 3 has', [false]))
  test('has (keep)', assert('[ 1 2 ] 2 ~has', [[1, 2], true]))
  test('map', assert('[ 1 2 ] [[ 1 + ]] map', [[2, 3]]))

  test('each', () => {
    const spy = mock.fn<(value: unknown) => void>()
    const evm = new EVM({
      'spy()': ({ pop }) => {
        spy(pop())
      }
    })
    evm.execute('[ 1 2 ] [[ spy() ]] each')
    const args = spy.mock.calls.flatMap(call => call.arguments)
    deepStrictEqual(args, [1, 2])
  })
})

describe('Assertion words', () => {
  test('is-num (num)', assert('1 is-num', [true]))
  test('is-num (boolean)', assert(':true is-num', [false]))
  test('is-num (list)', assert('[ 1 ] is-num', [false]))
  test('is-num (tuple)', assert(`${mockTuple} is-num`, [false]))
  test('is-num (callback)', assert('[[ + ]] is-num', [false]))
  test('is-num (keep)', assert('1 ~is-num', [1, true]))
})

describe('Callback words', () => {
  test('call', assert('2 [[ 2 * ]] call', [4]))
})

describe('Number syntax', () => {
  test('Integers', assert('1 23 456 789', [1, 23, 456, 789]))
  test('Floats', assert('0.1 3.45 67.89', [0.1, 3.45, 67.89]))
  test('Hexadecimal', assert(
    '0x12 0x34 0x56 0x78 0x9a 0xbc 0xde 0xf',
    [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf],
  ))
  test('Negative numbers', assert('-1 -23 -456 -7.89', [-1, -23, -456, -7.89]))
})

describe('Boolean syntax', () => {
  test(':true', assert(':true', [true]))
  test(':false', assert(':false', [false]))
})

describe('List syntax', () => {
  test('Scalars in lists', assert('[ 1 2 :true ]', [[1, 2, true]]))
  test('Lists in lists', assert('[ [ 1 2 ] 3 ]', [[[1, 2], 3]]))
  test('Variables in lists', assert('1 var x! [ x 2 3 ]', [[1, 2, 3]]))
  test('Callbacks in lists', assert('[ 2 [[ 2 * ]] ]', [[2, { [EVM_CALLBACK]: true, script: '2 *', closure: {} }]]))
})

describe('Tuple syntax', () => {
  test('Tuple initialization', assert(`
    tup vec{}
      .x 0 .y 0
    end

    16 9 vec{}
  `, [{
    [TUPLE_TYPE]: 'vec{}',
    x: 16,
    y: 9,
  }]))

  test('Tuple get', assert(`${mockTuple} .value`, [0]))
  test('Tuple get (keep)', assert(`${mockTuple} ~.value`, [{
    [TUPLE_TYPE]: 'mock{}',
    value: 0,
  }, 0]))
  test('Tuple set', assert(`${mockTuple} 1 .value!`, [{
    [TUPLE_TYPE]: 'mock{}',
    value: 1,
  }]))
  test('Tuple set (keep)', assert(`${mockTuple} 1 ~.value!`, [{
    [TUPLE_TYPE]: 'mock{}',
    value: 0,
  }, {
    [TUPLE_TYPE]: 'mock{}',
    value: 1,
  }]))
})

describe('Variables', () => {
  describe('Globals', () => {
    test('Default value is 0', assert('var x x', [0]))
    test('Immediate assignment', assert('1 var x! x', [1]))
    test('Reassignment', assert('var x 1 x!', [1]))
    test('Accessible within if?', assert(`
      1 var x!

      :true if?
        x
      end
    `, [1]))
    test('Accessible within function', assert(`
      1 var x!

      fn test()
        x
      end

      test()
    `, [1]))
    test('Accessible within if? within function', assert(`
      1 var x!

      fn test()
        :true if?
          x
        end
      end

      test()
    `, [1]))
    test('Accessible within callback', assert(`
      1 var x!
      [[ x ]] call
    `, [1]))
  })
})
