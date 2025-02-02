export const proxify = (
  root: Record<string, any>,
  onChange: () => void
) => {
  const map = new WeakMap()

  const handler = {
    deleteProperty: (
      target: Record<string, any>,
      key: string,
    ) => {
      if (Reflect.has(target, key)) {
        const value = target[key]
        if (
          typeof value === 'object'
          && value
          && map.has(value)
        ) {
          map.get(value).revoke()
        }

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
    ) => {
      const existingValue = target[key]
      if (existingValue !== value) {
        if (
          typeof existingValue === 'object'
          && existingValue
          && map.has(existingValue)
        ) {
          map.get(existingValue).revoke()
        }

        target[key] = (
          typeof value === 'object'
            && value
            ? (
              map.has(value)
                ? map.get(value).proxy
                : createProxy(value)
            )
            : value
        )

        onChange()
      }
      return true
    }
  }

  const createProxy = (
    target: Record<string, any>
  ): Record<string, any> => {
    if (map.has(target)) {
      return map.get(target).proxy
    }

    for (const key in target) {
      const value = target[key]
      if (
        value
        && typeof value === 'object'
      ) {
        target[key] = createProxy(value)
      }
    }

    const revocable = Proxy.revocable(target, handler)
    map.set(target, revocable)
    return revocable.proxy
  }

  return createProxy(root)
}
