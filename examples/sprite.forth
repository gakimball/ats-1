[ 0xf8 0xf8 0xf8 0xf8 0xf8 0x00 0x00 0x00 0x00 0x00 0x3e 0x3e 0x3e 0x3e 0x3e 0x00 ]
var sprites/test!

[ 0xffffff 0x000000 0xff0000 0x72dec2 ]
var palettes/test!

64 64 vec{} var position!

fn game()
  update()
  draw()
end

( -- )
fn update()
  0 let delta!

  notes()
  60 ~has if?
    delta 1 - delta!
  end
  62 ~has if?
    delta 1 + delta
  end

  position ~.x delta + .x! position!
end

( -- )
fn draw()
  cls()
  position .x position .y 1 1 rect{}
  sprites/test spr()
end
