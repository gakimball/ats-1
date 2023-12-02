A forth??

# Syntax

## Values

- Decimal: `15`
- Hexadecimal: `0xf`
- Lists: `[ 1 2 3 ]`

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

```
( Define a variable )
var x

( Push the value onto the stack )
x

( Reassign it: 0 => 1 )
1 + x!
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

```
1 if?
  2
else
  3
end
```

# Ideas

A tuple syntax for objects/dictionaries, that maps named properties to array indexes:

```
( Define )
tup vector{}
  .x 0 .y 0
end

( Create )
( x y -- vector )
2 4 vector{}

( Get )
( vector prop -- value )
.x ( => 2 )

( Alter )
( vector value -- vector' )
3 .x!
```

---

Maybe a quick "keep" syntax, so instead of writing this:

```
[ 1 2 3 ] dup length
```

You can write:

```
[ 1 2 3 ] ~length
```

# License

MIT &copy; [Geoff Kimball](https://geoffkimball.com)
