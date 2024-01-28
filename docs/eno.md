# Variables

## `#notes`

## `#notes-pressed`

## `#files`

## `gfx/colors`

# Tuples

## `vec{}`

## `rect{}`

## `note{}`

## `file{}`

## 

# Functions

## pixel()

```
( vec{} color:number -- )
```

## rect()

```
( rect:rect{} color:number -- )
```

Draw a solid rectangle with the given size/color.

## line()

```
( from:vec{} to:vec{} color:number -- )
```

Draw a 1px line between two points.

## spr()

```
( rect:rect{} sprite:number[] -- )
```

## text()

```
( position:vec{} text:string -- )
```

Draw text at the given coordinates.

## cls()

```
( -- )
```

Clear the screen. Typically, you'll call this at the start of the `game()` function.

## midi-cc()

```
( id:number -- value:number )
```

Read the current value for the given MIDI CC control (between 0 and 127).

## midi-pc()

```
( -- value:number )
```

Returns a positive integer if a Program Change happened on the previous frame, or `-1` otherwise.

## route-midi()

```
( -- )
```

Forward all incoming MIDI messages to the system output.

## file/play()

```
( file:file{} -- )
```

Play the given MIDI file (a `file{}` tuple), routing its events to the system output.

## stop-playback()

```
( -- )
```

Stop playing the current file, which will halt the flow of events to the system output.

## random()

```
( min:number max:number -- value:number )
```

Return a random integer between `min` and `max`, inclusive of both.

## sin()

```
( value:number -- rads:number )
```

Return the sine of a number in radians.

## cos()

```
( value:number -- rads:number )
```

Return the cosine of a number in radians.

## tan()

```
( value:number -- rads:number )
```

Return the tangent of a number in radians.

## pi()

```
( -- pi:number )
```

Return pi.
