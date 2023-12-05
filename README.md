# Audio TeleSystem (ATS-1)

> A fantasy console

Released in 1981, the Audio TeleSystem&trade; Model 1 (ATS-1) was an innovative video computer system known for using MIDI devices for player input, instead of traditional joysticks.

ATS-1 games are stored on tapes, which contain games and other programs written in Eno. Eno is an stack-based, interpreted language run on the Eno Virtual Machine (EVM).

## Contents

- [Demo](#demo)
- [Eno syntax](#eno-syntax)
- [Virtual machine](#virtual-machine)
- [Prior art](#prior-art)
- [To do](#to-do)
- [License](#license)

## Demo

View the online demo here:

<https://geoff.computer/ats>

To run the demo locally:

```
git clone https://github.com/gakimball/ats-1
cd ats-1
npm install
npm start
```

The web app will be viewable on port 3000.

Other commands:

- `npm run repl`: opens a command line REPL for Eno
- `npm run eval <file>`: run an Eno script and see the final stack

## Eno syntax

### Types

Every value on the stack has a type. Stack values do not have a size limit.

- Numbers: `15` (decimal) or `0xf` (hexadecimal)
- Booleans: `:true` and `:false`
- Lists: `[ 1 2 3 ]`
  - Lists can only contain scalar values (numbers and booleans)
- Tuples: `0 0 vec{}`
- Callbacks: `[[ dup * ]]`

### Basics

Eno is a stack language. Values (numbers, lists, etc.) are placed on the stack, and words are used to modify those stack values.

```
( result is 6 )
1 2 + 2 *
```

Or explained in more detail:

```
1 ( add 1 to the stack )
2 ( add 2 to the stack )
+ ( remove the top two elements of the stack, add them, and place the sum on the stack )
2 ( add 2 to the stack )
* ( remove the top two elements of the stack, multiply them, and place the product on the stack )
```

### Variables

There are three kinds of variables:

- `var`: global
- `const`: global constant
- `let` local (within `fn`)

```
( Define a variable )
var x

( Push the value onto the stack )
x

( Reassign it: 0 => 1 )
1 + x!
```

By adding `!`, a variable can be defined and immediately assigned using the top stack value. If not immediately assigned, variables have the value `0` by default.

```
( Before )
var x 0 x!

( After )
0 var x!
```

Lexical scoping:

```
( Note: this is a contrived exmaple )
fn square()
  let value!
  value dup *
end

2 square() ( => 4 )
```

### Conditionals

`if?` is a truthy check:

- Number greater than 0
- `:true`, not `:false`
- List length greater than 0
- (Tuples are always truthy)

```
1 if?
  2
else
  3
end
```

### Functions

```
( Define a function )
fn square()
  dup *
end

( Execute it: 2 => 4 )
2 square()
```

### Callbacks

Callbacks are a series of instructions to be executed by another word/function. You can use them with the `map` and `each` words to iterate through lists.

```
( list callback -- list )
[ 1 2 3 ] [[ dup * ]] map

( result is [ 1 4 9 ] )
```

`map` expects the callback to place one new item on the stack. `each` does not expect a new item, and does not place a modified list on the stack. Use `map` to edit a list, and `each` for side effects.

```
[ 0 1 2 ] [[ draw-something() ]] each
```

To execute a callback directly, use the `call` word:

```
( num callback -- num )
2 [[ 3 * ]] call
```

### Tuples

Tuples are dictionaries with a fixed set of properties. Define a tuple, its properties, and their default values with the `tup` keyword:

```
tup point{}
  .x 0 .y 0
end
```

Initialize a tuple by placing all of its properties on the stack, in order, and then using the tuple name as a word:

```
( num num -- point{} )
5 10 point{}
```

Use the accessor syntax (leading `.`) to access a property value, which consumes the tuple.

```
( num num -- point{} )
5 10 point{}

( point{} -- num )
.x
```

To keep the tuple on the stack, use keep mode by prepending a `~`:

```
( num num -- point{} )
5 10 point{}

( point{} -- point{} num )
~.x
```

To assign a value to a tuple, append a `!` to the property. Tuples are immutable, so editing a property of a tuple produces a modified copy of the original.

```
( num num -- point{} )
5 10 point{}

( point{} num -- point{}' )
6 .x!
```

### Keep mode

Some accessor words can be changed to keep values on the stack, by prefixing the word with `~`.

| Word | Syntax | Stack effect |
| ---- | ------ | ------------ |
| index | `~index` | `( list index -- list list[index] )` |
| length | `~length` | `( list -- list len(list) )` |
| has | `~has` | `( list -- list boolean )` |
| property access | `~.prop` | `( tuple -- tuple tuple[prop] )` |

### Debugging

The `debug` word logs to the console the current set of variables, functions, tuples, and closure, without modifying the stack.

### All words

| Word | Before | After | After (keep) |
| ---- | ------ | ----- | ---- |
| `+`  | `a b`  | `a+b` | |
| `-`  | `a b`  | `a-b` | |
| `*`  | `a b`  | `a*b` | |
| `/`  | `a b`  | `a/b` | |
| `==` | `a b`  | `a==b` | |
| `dup` | `a` | `a a` | |
| `pop` | `a b` | `a` | |
| `swap` | `a b` | `b a` | |
| `index` | `list idx` | `list[idx]` | `list list[idx]` |
| `length` | `list` | `len(list)` | `list len(list)` |
| `has` | `list value` | `list.has(value)` | `list list.has(value)` |
| `is-num` | `value` | `is-num(value)` | `value is-num(value)` |
| `map` | `list callback` | `list'` | |
| `each` | `list callback`| `--` | |
| `call` | `callback` | `--` | |

## Virtual machine

The EVM executes an Eno script. Eno is an interpreted language, with no intermediate compile step.

```ts
// There's no npm module for this, so assume this script is in the root of the repo
import { EVM } from './src/evm'

const evm = new EVM()

evm.execute('1 2 +')
console.log(evm.getStack()) // => [3]

// An instance of the VM is a single execution context
evm.execute('dup * dup')
console.log(evm.getStack()) // => [9, 9]
```

### Syscalls

An EVM instance can provide custom syscalls, which can run external code.

```ts
import { readFileSync } from 'node:fs'
import { EVM } from './src/evm'

const evm = new EVM({
  'load-file()': ({ push }) => {
    // This is a slightly contrived example because string types don't exist yet
    const file = readFileSync('some/file.txt').toString()
    push(file)
  },
})
```

Syscalls have access to these helper methods:

- `pop()`: return the top value of the stack
- `push(value)`: push a value on top of the stack
- `execute(str)`: run code in the VM's current context
- `variable(name)`: get the value of a variable
- `num(value)`: assert a value is a number
- `list(value)`: assert a value is a list
- `tuple(type, value)`: assert a value is a tuple of a certain type
  - `type` must include the trailing braces, e.g. `tuple('rect{}', pop())`

## Prior art

- [uxn](https://100r.co/site/uxn.html)
- [learn-uxn](https://metasyn.pw/learn-uxn)
- [TIC-80](https://tic80.com/)
- [Firth](https://littlemanstackmachine.org/firth.html)
- [Factor](https://factorcode.org/)

## To do

- Support negative numbers (`-1`)
- Support floats (`0.2`)
- Loop syntax (`do`, `loop`, `stop`)

## License

MIT &copy; [Geoff Kimball](https://geoffkimball.com)
