var player/x
var player/y
var bullet/x 0 1 - bullet/x!
var bullet/y 0 1 - bullet/y!

fn game()
  updateplayer()
  updatebullet()
  draw()
end

fn updateplayer()
  btn/up btn() if?
    player/y 1 - player/y!
  end

  btn/down btn() if?
    player/y 1 + player/y!
  end

  btn/left btn() if?
    player/x 1 - player/x!
  end

  btn/right btn() if?
    player/x 1 + player/x!
  end

  btn/a btn() if?
    player/x 10 + bullet/x!
    player/y 5 + bullet/y!
  end
end

fn updatebullet()
  bulletismoving() if?
    bullet/x 1 60 / + bullet/x!

    bullet/x tv/w - if?
      0 1 - bullet/x!
      0 1 - bullet/y!
    end
  end
end

fn bulletismoving()
  bullet/x if?
    :true
  else
    :false
  end
end

fn draw()
  cls()

  player/x player/y xy()
  10 10 wh()
  0xff0000 rect()

  bullet/x bullet/y xy()
  1 1 wh()
  0xff0000 rect()
end
