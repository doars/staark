/**
 * Creates a deep clone of a javascript value.
 *
 * @param {any} value Data to clone.
 * @returns {any} Clone of the data.
 */
export const cloneRecursive = (
  value,
) => {
  if (typeof (value) === 'object') {
    const clone = (
      Array.isArray(value)
        ? []
        : {}
    )
    for (const key in value) {
      clone[key] = cloneRecursive(value[key])
    }
    return clone
  }
  return value
}
