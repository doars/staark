export const proxify = (
  root: Record<string, any>,
  onChange: () => void,
): Record<string, any> => {
  const handler = {
    deleteProperty: (
      target: Record<string, any>,
      key: string,
    ): boolean => {
      if (Reflect.has(target, key)) {
        const deleted = Reflect.deleteProperty(target, key)

        if (deleted) {
          onChange()
        }

        return deleted
      }
      return true
    },

    set: (
      target: Record<string, any>,
      key: string,
      value: any,
    ): boolean => {
      const existingValue = target[key]
      if (existingValue !== value) {
        // Add proxy if value is an object.
        if (
          value
          && typeof (value) === 'object'
        ) {
          value = add(value)
        }
        target[key] = value

        // Dispatch set event. If the target is an array and a new item has been pushed then the length has also changed, therefore a more generalizable path will be dispatched.
        onChange()
      }
      return true
    },
  }

  /**
   * Add object to start keeping track of it.
   * @param {Object} target Object that is being kept track of.
   * @returns {Proxy} Object to access and mutate.
   */
  const add = (
    target: Record<string, any>,
  ): Record<string, any> => {
    // Recursively create proxies for each property.
    for (const key in target) {
      if (
        target[key]
        && typeof (target[key]) === 'object'
      ) {
        target[key] = add(target[key])
      }
    }

    return new Proxy(target, handler)
  }

  return add(root)
}
