import { readFileSync } from 'node:fs';
import { EVM } from '../src/evm';

const scriptPath = process.argv[2]
const script = readFileSync(scriptPath).toString()
const evm = new EVM()

console.log(evm.execute(script))
