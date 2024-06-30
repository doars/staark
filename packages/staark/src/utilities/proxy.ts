import {
  GenericObjectAny,
} from '@doars/staark-common/src/generics.js'

export type ProxyData = {
  // Proxy
  p: GenericObjectAny
  // Stop proxy
  s: () => void
}

export const proxify = (
  root: GenericObjectAny,
  onChange: () => void,
): ProxyData => {
  // Setup WeakMap to keep track of created proxies.
  const map = new WeakMap()

  /**
   * Remove object from being kept track of.
   * @param {GenericObjectAny} target Object that is being kept track of.
   */
  const remove = (
    target: GenericObjectAny,
  ): void => {
    // Check if target exists in case of recursion.
    if (map.has(target)) {
      // Remove target from the map.
      const revocable = map.get(target)
      map.delete(revocable)

      // Recursively remove properties as well.
      for (const property in revocable.proxy) {
        if (typeof (revocable.proxy[property]) === 'object') {
          remove(revocable.proxy[property])
        }
      }

      // Revoke proxy.
      revocable.revoke()
    }
  }

  /**
   * Add object to start keeping track of it.
   * @param {Object} target Object that is being kept track of.
   * @returns {Proxy} Object to access and mutate.
   */
  const add = (
    target: GenericObjectAny,
  ): GenericObjectAny => {
    // Exit early if proxy already exists prevent recursion.
    if (map.has(target)) {
      return map.get(target)
    }

    // Recursively create proxies for each property.
    for (const key in target) {
      if (target[key] && typeof (target[key]) === 'object') {
        target[key] = add(target[key])
      }
    }

    // Create proxy.
    const revocable = Proxy.revocable(target, {
      deleteProperty: (
        target: GenericObjectAny,
        key: string,
      ): boolean => {
        // Exit early successful if property doesn't exist.
        if (!Reflect.has(target, key)) {
          return true
        }

        // Remove proxy.
        remove(target)

        // Delete property.
        const deleted = Reflect.deleteProperty(target, key)

        // Dispatch delete event.
        if (deleted) {
          onChange()
        }

        // Return deleted.
        return deleted
      },

      set: (
        target: GenericObjectAny,
        key: string,
        value: any,
      ): boolean => {
        const existingValue = target[key]
        if (existingValue !== value) {
          // Remove existing value if value is an object.
          if (typeof (existingValue) === 'object') {
            remove(existingValue)
          }

          // Add proxy if value is an object.
          if (value && typeof (value) === 'object') {
            value = add(value)
          }
          // Store value.
          target[key] = value

          // Dispatch set event. If the target is an array and a new item has been pushed then the length has also changed, therefore a more generalizable path will be dispatched.
          onChange()
        }

        // Return success.
        return true
      },
    })

    // Store target at proxy.
    map.set(revocable, target)

    // Return proxy.
    return revocable.proxy
  }

  // Return dispatcher and proxy.
  return {
    // Add initial root.
    p: add(root),
    // Stop dispatcher by removing root.
    s: () => remove(root),
  }
}
