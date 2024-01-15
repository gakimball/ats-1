export const CORE_WORDS = `
( STACK )

( a -- a a )
word dup let a! a a end

( a b -- a a b )
word dupd let b! dup b end

( a b -- b a )
word swap let b! let a! b a end


( LISTS )

( -- list )
word [] [ ] end

( list -- list[0] )
word first 0 get end

( list prop -- list list[prop] )
word ~get dupd get end

( list -- list len )
word ~length dup length end

( list value -- list' )
word append let value! ~length value set end

( a b -- [...a ...b] )
word concat
  swap let res!
  [[ res swap append res! ]] each
  res
end

( list cb -- list' )
word map
  let cb! [] let res!
  [[ cb call res swap append res! ]] each
  res
end

( list cb -- list' )
word filter
  let cb! [] let res!
  [[ cb ~call if? res swap append res! else pop end ]] each
  res
end


( TUPLES )

( tup value -- tup has? )
word ~has dupd has end

( tup -- ...props )
word unfurl
  let tup!
  tup props reverse [[ tup _ get ]] each
end

( a{} b{} -- a'{} )
word copy
  let b! let a!
  b props
    [[ a _ has-prop ]] filter
    [[ let p! a b p get p swap set a! ]] each
  a
end


( CALLBACKS )

( value cb -- value )
word ~call dupd call end

( list cb -- list )
word ~each dupd each end

( value a b -- valuea valueb )
word apply2
  let b!
  dupd call swap b call
end

( value if then -- )
word applyif
  let then!
  dupd call if? then call else pop end
end

( a b -- and )
word and
  let a! let b!
  a if? b if? :true else :false end else :false end
end


( VALUES )
word ~is-num dup is-num end
`.trim()
