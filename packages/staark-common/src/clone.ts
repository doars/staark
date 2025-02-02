/**
 * Creates a deep clone of a javascript value.
 * @param value Data to clone.
 * @returns Clone of the data.
 */
export const cloneRecursive = (
  value: any,
) => {
  if (typeof (value) === 'object') {
    const clone: Record<any, any> = Array.isArray(value) ? [] : {}
    for (const key in value) {
      clone[key] = cloneRecursive(value[key])
    }
    return clone
  }
  return value
}
