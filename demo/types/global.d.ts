declare module '*.module.css' {
  const styles: {
    [name: string]: string;
  }

  export default styles
}

declare module '*.eno' {
  const script: string;

  export default script
}
