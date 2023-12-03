interface ForthMachineToken {
  value: string;
  line: number;
}

const stripComments = (value: string) => value.replace(/\([^)]+\)/g, '')

export const tokenize = (script: string): ForthMachineToken[] => {
  const tokens: ForthMachineToken[] = []

  script.trim().split('\n').forEach((line, index) => {
    stripComments(line).split(/\s+/).forEach(value => {
      if (value.length > 0) {
        tokens.push({
          value,
          line: index + 1,
        });
      }
    })
  })

  return tokens;
}
