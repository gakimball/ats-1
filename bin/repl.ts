import readline from 'node:readline'
import { EVM } from '../src/evm'

const rl = readline.createInterface({
  prompt: 'EVM > ',
  input: process.stdin,
  output: process.stdout,
})

rl.prompt()

const evm = new EVM()

rl.on('line', input => {
  try {
    console.log(evm.execute(input))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`Error: ${error.message}`)
    }
  }

  rl.prompt()
})
