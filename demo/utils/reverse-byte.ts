export const reverseByte = (input: number): number => {
  let reversed = 0;

  for (let i = 0; i < 8; i++) {
    reversed <<= 1;
    reversed |= input & 1;
    input >>= 1;
  }

  return reversed;
}
