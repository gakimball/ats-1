A forth??

# Syntax

## Values

- Decimal: `15`
- Hexadecimal: `0xf`
- Booleans: `:true`, `:false`
- Lists: `[ 1 2 3 ]`
  - Lists can only contain scalar values (numbers and booleans)

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

Variables can be global `var`, or scoped to a function `let`.

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

## Functions

```
( Define a function )
fn square()
  dup *
end

( Execute it: 2 => 4 )
2 square()
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

## To do

- Support negative numbers (`-1`)
- Support floats (`0.2`)
- Loop syntax (`do`, `loop`, `stop`)

# License

MIT &copy; [Geoff Kimball](https://geoffkimball.com)
