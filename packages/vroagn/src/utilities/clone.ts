
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
