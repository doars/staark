/**
 * Creates a deep clone of a javascript value.
 * @deprecated Use window.structuredClone instead, is able to clone more data and reduces build size. However only supported in most browsers since January 2022.
 * @param value Data to clone.
 * @returns Clone of the data.
 */
export const cloneRecursive = (
  value: any,
) => {
  if (typeof (value) === 'object') {
    if (Array.isArray(value)) {
      const clone: any[] = []
      for (let i = 0; i < value.length; i++) {
        clone.push(cloneRecursive(value[i]))
      }
      value = clone
    } else {
      const clone: Record<string, any> = {}
      for (const key in value) {
        clone[key] = cloneRecursive(value[key])
      }
      value = clone
    }
  }
  return value
}
