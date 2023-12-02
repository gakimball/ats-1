# Nov 22, 2023

Last night I found myself reading a few articles on Forth, and stack machines more broadly. So for the third time this year, I'm writing a small toy programming language. The syntax is pretty indebted to Firth, the language used by the Little Man Stack Machine designed by Big Sky Software:

<https://littlemanstackmachine.org/firth.html>

I want something even more ergonomic, so I'm going to add more built-in words.

This is going to be a language designed to run in a VM, so there's no concept of bit size or anything like that. For now, it's a stack machine that can hold numbers of arbitrary size. I'd like to add more types as well. Definitely strings, maybe booleans, maybe also function references, as a way to do event handling.

Backing out a bit further, I've had this vague idea in my head for the last few months of a fantasy console built around MIDI input. If I designed a fantasy console, I like the idea of designing a programming language for it, and I wanted to do something "low tech" (and, well, easy to parse). I thought about a Lisp, but Lisps confuse me, and somehow stack languages confuse me slightly less. It's probably the lack of parentheses.

Turns out parsing a stack language is pretty straightforward. The only tricky thing so far is parsing functions and conditionals, which end with an `end` statement. The parser needs to handle this without tripping up:

```
fn example()
  if?
    dup +
    if?
      2 +
    end
  else
    pop
  end
end
```

Although I'm interested in designing my own language, I am decidedly less interested in designing accompanying machine code, or a memory layout for the console. This will be an extremely _virtual_ machine.

I'm building the core language/VM and the fantasy console separately. The VM supports syscalls, so the fantasy console will include special functions like `pixel()` or `sprite()` to draw things to the screen.
