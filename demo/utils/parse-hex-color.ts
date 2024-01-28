export const parseHexColor = (hexColor: string) => {
  const number = Number.parseInt(hexColor.slice(1), 16)

  return {
    red: number >> 16,
    green: (number >> 8) & 255,
    blue: number & 255,
  }
}
