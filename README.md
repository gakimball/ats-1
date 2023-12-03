# Audio TeleSystem (ATS-1)

Released in 1981, the Audio TeleSystem&trade; Model 1 (ATS-1) was an innovative video computer system known for using MIDI devices for player input, instead of traditional joysticks.

ATS-1 games are stored on tapes, which contain games and other programs written in Eno. Eno is an stack-based, interpreted language run on the Eno Virtual Machine (EVM).

# Eno syntax

## Types

Every value on the stack has a type. Stack values do not have a size limit.

- Numbers: `15` (decimal) or `0xf` (hexadecimal)
- Booleans: `:true` and `:false`
- Lists: `[ 1 2 3 ]`
  - Lists can only contain scalar values (numbers and booleans)
- Tuples

## Words

| Word | Before | After | Keep |
| ---- | ------ | ----- | ---- |
| `+`  | `a b`  | `a+b` | |
| `-`  | `a b`  | `a-b` | |
| `*`  | `a b`  | `a*b` | |
| `/`  | `a b`  | `a/b` | |
| `dup` | `a` | `a a` | |
| `pop` | `a b` | `a` | |
| `swap` | `a b` | `b a` | |
| `index` | `list idx` | `list[idx]` | `~index` |
| `length` | `list` | `len(list)` | `~length` |

## Variables

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

By adding `!`, a variable can be defined and immediately assigned using the top stack value:

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

## Conditionals

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

## Functions

```
( Define a function )
fn square()
  dup *
end

( Execute it: 2 => 4 )
2 square()
```

## Tuples

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

( point{} - num )
.x
```

To keep the tuple on the stack, use keep mode by prepending a `~`:

```
( num num -- point{} )
5 10 point{}

( point{} - point{} num )
~.x
```

To assign a value to a tuple, append a `!` to the property. Tuples are immutable, so editing a property of a tuple produces a modified copy of the original.

```
( num num -- point{} )
5 10 point{}

( point{} num -- point{}' )
6 .x!
```

## Keep mode

Some accessor words can be changed to keep values on the stack, by prefixing the word with `~`.

| Word | Syntax | Stack effect |
| ---- | ------ | ------------ |
| index | `~index` | `( list index -- list list[index] )` |
| length | `~length` | `( list -- list len(list) )` |
| has | `~has` | `( list -- list boolean )` |
| property access | `~.prop` | `( tuple -- tuple tuple[prop] )` |

## Debugging

The `debug` word logs to the console the current set of variables, functions, tuples, and closure, without modifying the stack.

# Prior art

- [uxn](https://100r.co/site/uxn.html)
- [learn-uxn](https://metasyn.pw/learn-uxn)
- [TIC-80](https://tic80.com/)
- [Firth](https://littlemanstackmachine.org/firth.html)
- [Factor](https://factorcode.org/)

# To do

- Support negative numbers (`-1`)
- Support floats (`0.2`)
- Loop syntax (`do`, `loop`, `stop`)

# License

MIT &copy; [Geoff Kimball](https://geoffkimball.com)
