export interface Change {
  type: 'delete' | 'set',
  path: string[],
  new?: any,
  old?: any,
}

// Function to set a value at a given path.
const setValueAtPath = (
  record: Record<string, any>,
  path: string[],
  value: any,
) => {
  let current = record
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = structuredClone(value)
}

// Function to delete a value at a given path.
const deleteValueAtPath = (
  record: Record<string, any>,
  path: string[],
) => {
  let current = record
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]]
    if (!current) {
      // Path doesn't exist, so nothing to delete.
      return
    }
  }
  if (Array.isArray(current)) {
    current.splice(parseInt(path[path.length - 1]), 1)
  } else {
    delete current[path[path.length - 1]]
  }
}

export const determineDiff = (
  before: Record<string, any>,
  after: Record<string, any>,
  path: string[] = [],
): Change[] => {
  const changes: Change[] = []

  // Check for keys in the "before" object that are not in "after".
  for (const key in before) {
    const currentPath = [...path, key]

    if (!(key in after)) {
      changes.unshift({
        type: 'delete',
        path: currentPath,
        old: structuredClone(before[key]),
      })
    } else if (
      typeof before[key] === 'object'
      && typeof after[key] === 'object'
    ) {
      // If both are objects, recurse deeper.
      changes.unshift(
        ...determineDiff(before[key], after[key], currentPath)
      )
    } else if (before[key] !== after[key]) {
      // If the value has changed, record the new and old value.
      changes.unshift({
        type: 'set',
        path: currentPath,
        old: structuredClone(before[key]),
        new: structuredClone(after[key]),
      })
    }
  }

  // Check for keys in the "after" object that were not in "before".
  for (const key in after) {
    if (!(key in before)) {
      changes.unshift({
        type: 'set',
        path: [...path, key],
        new: structuredClone(after[key]),
      })
    }
  }

  return changes
}

export const applyDiff = (
  state: Record<string, any>,
  diff: Change[],
): Record<string, any> => {
  for (const change of diff) {
    if (change.type === 'set') {
      setValueAtPath(state, change.path, change.new)
    } else if (change.type === 'delete') {
      deleteValueAtPath(state, change.path)
    }
  }
  return state
}

export const revertDiff = (
  state: Record<string, any>,
  diff: Change[],
): Record<string, any> => {
  for (const change of diff) {
    if (change.type === 'set') {
      if (change.old === undefined) {
        deleteValueAtPath(state, change.path)
      } else {
        setValueAtPath(state, change.path, change.old)
      }
    } else if (change.type === 'delete') {
      setValueAtPath(state, change.path, change.old)
    }
  }
  return state
}
