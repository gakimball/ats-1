import { EVMClosure, EVMType, EVM_CALLBACK } from '../types/machine-type';
import { resolveVariable } from './resolve-variable';

/**
 * Parse a value, e.g. a string, a number, but not a word or control syntax. If a value can't
 * be divined, then the value is treated as a variable.
 *
 * @param tokens Complete list of tokens for the current execution context.
 * @param index The starting index of the token to be parsed.
 * @param closures List of variables in scope.
 *
 * @returns A value, if found, and a new index for the pointer, in case the value spans
 * multiple tokens.
 */
export const parseValue = (
  tokens: string[],
  index: number,
  closures: EVMClosure[],
): {
  value: EVMType | undefined;
  newIndex: number;
} => {
  const token = tokens[index]

  if (token.match(/^\-?\d+(\.\d+)?$/)) {
    return {
      value: Number.parseFloat(token),
      newIndex: index,
    }
  }

  if (token.startsWith('0x')) {
    return {
      value: Number.parseInt(token.slice(2), 16),
      newIndex: index,
    }
  }

  if (token === ':true') {
    return {
      value: true,
      newIndex: index,
    }
  }

  if (token === ':false') {
    return {
      value: false,
      newIndex: index,
    }
  }

  if (token === '[') {
    let newIndex = index
    const values: EVMType = []

    while (++newIndex) {
      const nextToken = tokens[newIndex]

      if (nextToken === ']') {
        return {
          value: values,
          newIndex,
        }
      }

      const parsed = parseValue(tokens, newIndex, closures)
      newIndex = parsed.newIndex

      if (parsed.value === undefined) {
        throw new Error(`Cannot use ${tokens[newIndex]} in a list`)
      }

      values.push(parsed.value)
    }
  }

  if (token === '[[') {
    let stack = 0
    let inString = false
    let newIndex = index
    let placeholders = 0

    while (++newIndex) {
      const nextToken = tokens[newIndex]

      if (nextToken.startsWith("'") && !inString) {
        inString = true;
      }

      if (nextToken.endsWith("'") && inString) {
        inString = false;
      }

      if (inString) continue

      if (nextToken === '[[') {
        stack++
      } else if (nextToken === ']]') {
        stack--

        if (stack < 0) {
          return {
            value: {
              [EVM_CALLBACK]: true,
              script: tokens.slice(index + 1, newIndex).join(' '),
              closures,
              placeholders,
            },
            newIndex,
          }
        }
      } else if (nextToken === '_' && stack === 0) {
        placeholders += 1
      }
    }
  }

  if (token.startsWith("'")) {
    let newIndex = index

    do {
      const nextToken = tokens[newIndex]

      if (nextToken.endsWith("'")) {
        return {
          value: tokens.slice(index, newIndex + 1).join(' ').slice(1, -1),
          newIndex,
        }
      }
    } while (++newIndex)
  }

  return {
    value: resolveVariable(token, closures)?.value,
    newIndex: index,
  }
}
