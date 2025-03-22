/**
 * Creates a proxy for the given root object to track changes and invoke the onChange callback.
 *
 * @param {Record<string, any>} root - The root object to be proxified.
 * @param {() => void} onChange - The callback function to be invoked on changes.
 * @returns {Record<string, any>} - The proxified root object.
 */
export const proxify = (
  root,
  onChange,
) => {
  const handler = {
    /**
     * Deletes a property from the target object and invokes the onChange callback if the property existed.
     *
     * @param {Record<string, any>} target - The target object from which the property will be deleted.
     * @param {string} key - The key of the property to be deleted.
     * @returns {boolean} - True if the property was deleted, otherwise false.
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
     * Sets a property on the target object and invokes the onChange callback if the value has changed.
     *
     * @param {Record<string, any>} target - The target object on which the property will be set.
     * @param {string} key - The key of the property to be set.
     * @param {any} value - The value to be set.
     * @returns {boolean} - True if the property was set, otherwise false.
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
   * Recursively creates proxies for each property of the target object to track changes.
   *
   * @param {Record<string, any>} target - The object to be proxified.
   * @returns {Record<string, any>} - The proxified object.
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
