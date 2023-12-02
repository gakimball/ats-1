fn game()
  cls()
  0 print_note()
end

fn print_note()
  let idx!
  notes() idx index if?
    idx 0 1 10 rect{} 0xff0000 rect()
    idx 1 + print_note()
  end
end
