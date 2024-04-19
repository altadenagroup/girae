// @ts-ignore
Array.prototype.chunk = function (chunkSize) {
  const array = this
  return Array(Math.ceil(array.length / chunkSize))
    .fill(0)
    .map((_, index) => index * chunkSize)
    .map((begin) => array.slice(begin, begin + chunkSize))
}
