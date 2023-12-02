export enum ForthMachineWords {
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  POP = 'pop',
  DUP = 'dup',
  SWAP = 'swap',
  IF = 'if?',
  ELSE = 'else',
  VAR = 'var',
  LET = 'let',
  FN = 'fn',
  TUP = 'tup',
  END = 'end',
  DEBUG = 'debug',
  INDEX = 'index',
  LENGTH = 'length',
  LISTSTART = '[',
  LISTEND = ']',
}

export const FORTH_MACHINE_WORDS = Object.values(ForthMachineWords)
