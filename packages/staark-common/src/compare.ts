export const equalRecursive = (
  valueA: any,
  valueB: any,
): boolean => {
  if (valueA === valueB) {
    return true
  }

  if (
    !valueA
    || !valueB
    || typeof valueA !== 'object'
    || typeof valueB !== 'object'
  ) {
    return valueA === valueB
  }

  if (
    valueA instanceof Date) {
    return (
      valueB instanceof Date
      && valueA.getTime() === valueB.getTime()
    )
  }

  // if (valueA.prototype !== valueB.prototype) {
  //   return false
  // }

  const keys = Object.keys(valueA)
  return (
    keys.length === Object.keys(valueB).length
    && keys.every(k => equalRecursive(valueA[k], valueB[k]))
  )
}
