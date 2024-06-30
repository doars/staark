export const equalRecursive = (
  valueA: any,
  valueB: any,
): boolean => {
  if (valueA === valueB) {
    return true
  }
  if (
    valueA instanceof Date
    && valueB instanceof Date
  ) {
    return valueA.getTime() === valueB.getTime()
  }
  if (
    !valueA
    || !valueB
    || (
      typeof valueA !== 'object' && typeof valueB !== 'object'
    )
  ) {
    return valueA === valueB
  }
  if (
    valueA === null
    || valueA === undefined
    || valueB === null
    || valueB === undefined
  ) {
    return false
  }
  if (valueA.prototype !== valueB.prototype) {
    return false
  }
  let keys = Object.keys(valueA)
  if (keys.length !== Object.keys(valueB).length) {
    return false
  }
  return keys.every(
    (key: string): boolean => equalRecursive(valueA[key], valueB[key]),
  )
}
