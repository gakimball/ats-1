export const NOTE_ON = 9;
export const NOTE_OFF = 8;

export type ForthConsoleButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'c' | 'd'

export const buttonCodes: ForthConsoleButton[] = ['up', 'down', 'left', 'right', 'a', 'b', 'c', 'd']

export const buttonKeyMap: {
  [code: string]: ForthConsoleButton;
} = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  x: 'a',
  z: 'b',
  s: 'c',
  a: 'd',
}

export const LOCALSTORAGE_KEY = 'script'

export const DEFAULT_SCRIPT = `
fn game()
  cls()
  64 64 vec{}
  0x0000ff pixel()
end
`.trim()
