import readline from 'node:readline'
import { ForthMachine } from '../src/forth'

const rl = readline.createInterface({
  prompt: 'Forth > ',
  input: process.stdin,
  output: process.stdout,
})

rl.prompt()

const forth = new ForthMachine()

rl.on('line', input => {
  try {
    console.log(forth.execute(input))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`Error: ${error.message}`)
    }
  }

  rl.prompt()
})
