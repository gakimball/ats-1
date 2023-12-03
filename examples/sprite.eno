[ 0xf8 0xf8 0xf8 0xf8 0xf8 0x00 0x00 0x00 0x00 0x00 0x3e 0x3e 0x3e 0x3e 0x3e 0x00 ]
var sprites/test!

64 64 vec{} var position!

fn game()
  update()
  draw()
end

( -- )
fn update()
  0 let delta!
  2 let speed!

  notes()
  60 ~has if?
    delta speed - delta!
  end
  62 ~has if?
    delta speed + delta!
  end

  position ~.x delta + .x! position!
end

( -- )
fn draw()
  cls()
  position .x position .y 1 1 rect{}
  sprites/test spr()
end
