import { readFileSync } from 'node:fs';
import { ForthMachine } from '../src/forth';

const scriptPath = process.argv[2]
const script = readFileSync(scriptPath).toString()
const forth = new ForthMachine()

console.log(forth.execute(script))
