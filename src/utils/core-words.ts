export const CORE_WORDS = `
( LISTS )

( -- list )
word [] [ ] end

( list -- list[0] )
word first 0 index end

( list prop -- list list[prop] )
word ~get dupd get end

( list -- list len )
word ~length dup length end

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
  [[ cb call if? res swap append res! end ]] each
  res
end


( TUPLES )

( tup value -- tup has? )
word ~has dupd has end


( CALLBACKS )

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


( VALUES )
word ~is-num dup is-num end
`.trim()
