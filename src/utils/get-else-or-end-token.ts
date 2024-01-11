/**
 * Find a closing `else` or `end` to pair with an `if?`.
 *
 * @param tokens List of tokens to traverse.
 * @param index Index of starting word.
 * @param startingWord Name of starting word.
 *
 * @returns Index of first token after the `end`
 * @throws {Error} Will throw if no `end` is found in the token list
 */
export const getElseOrEndToken = (tokens: string[], index: number, startingWord: string): number => {
  let nestedIfCount = 0

  while (index < tokens.length - 1) {
    const token = tokens[++index]

    switch (token) {
      case 'if?':
      case '~if?':
        nestedIfCount++
        break
      case 'else':
      case 'end':
        if (nestedIfCount === 0) {
          return index
        }
        if (token === 'end') {
          nestedIfCount--
        }
        break
    }
  }

  throw new Error(`Could not find matching else/end for ${startingWord}`)
}
