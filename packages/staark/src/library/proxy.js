/**
 * @param {Record<string, any>} root
 * @param {() => void} onChange
 * @returns {Record<string, any>}
 */
export const proxify = (
  root,
  onChange,
) => {
  const handler = {
    /**
     * @param {Record<string, any>} target
     * @param {string} key
     * @returns {boolean}
     */
    deleteProperty: (
      target,
      key,
    ) => {
      if (Reflect.has(target, key)) {
        const deleted = Reflect.deleteProperty(target, key)

        if (deleted) {
          onChange()
        }

        return deleted
      }
      return true
    },

    /**
     * @param {Record<string, any>} target
     * @param {string} key
     * @param {any} value
     * @returns {boolean}
     */
    set: (
      target,
      key,
      value,
    ) => {
      const existingValue = target[key]
      if (existingValue !== value) {
        // Add proxy if value is an object.
        if (
          value
          && typeof value === 'object'
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
   * @param {Record<string, any>} target Object that is being kept track of.
   * @returns {Record<string, any>} Object to access and mutate.
   */
  const add = (
    target,
  ) => {
    // Recursively create proxies for each property.
    for (const key in target) {
      if (
        target[key]
        && typeof target[key] === 'object'
      ) {
        target[key] = add(target[key])
      }
    }

    return new Proxy(target, handler)
  }

  return add(root)
}
