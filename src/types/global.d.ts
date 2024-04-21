export {}

declare global {
  var _brklyn: import('../Brooklyn.ts').default
}

// add chunk method to Array definition
declare global {
  interface Array<T> {
    chunk (chunkSize: number): T[][]
  }
}
