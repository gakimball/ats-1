/**
 * "Context" refers to states in which the normal parsing process is replaced with something
 * else. For example, when defining a callback (e.g. `[[ dup * ]]`), a "callback" context
 * is created. Within this context, tokens are simply collected instead of being executed
 * like usual.
 *
 * A context is opened with an opening marker like `[` or `[[`, and closed with a corresponding
 * closing marker. An exception is thrown if a closing marker is parsed without a matching
 * open context. For example, `[ ]]` is a syntax error.
 */

import { EVMClosure, EVMType, EVM_CALLBACK } from '../types/machine-type';

export type EVMContext = {
  type: 'list';
  value: EVMType[];
} | {
  type: 'callback';
  tokens: string[];
} | {
  type: 'string';
  value: string;
}

type EVMContextType = EVMContext['type']

/**
 * Parse a possible opening/closing context marker, if the given token is one.
 */
export const parseEVMContextMarker = (token: string): {
  type: EVMContextType;
  position: 'start' | 'end';
} | undefined => {
  switch (token) {
    case '[':
      return { type: 'list', position: 'start' }
    case ']':
      return { type: 'list', position: 'end' }
    case '[[':
      return { type: 'callback', position: 'start' }
    case ']]':
      return { type: 'callback', position: 'end' }
    default:
      if (token.startsWith('\'')) {
        debugger
        return { type: 'string', position: 'start' }
      }
      if (token.endsWith('\'')) {
        return { type: 'string', position: 'end' }
      }
  }
}

/**
 * Create an empty context object from the given type.
 */
export const createEVMContext = (type: EVMContextType): EVMContext => {
  switch (type) {
    case 'list': return { type, value: [] }
    case 'callback': return { type, tokens: [] }
    case 'string': return { type, value: '' }
  }
}

/**
 * Create an EVM value from a context object.
 */
export const finalizeEVMContext = (context: EVMContext, closures: EVMClosure[]): EVMType => {
  switch (context.type) {
    case 'list': case 'string': return context.value
    case 'callback': return {
      [EVM_CALLBACK]: true,
      script: context.tokens.join(' '),
      closures,
    }
  }
}
