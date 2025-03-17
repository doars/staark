import { cloneRecursive } from '../utilities/clone.js'

/**
 * @typedef {Object} Change
 * @property {'delete' | 'set'} type
 * @property {string[]} path
 * @property {*} [new]
 * @property {*} [old]
 */

/**
 * Function to set a value at a given path.
 * @param {Record<string, any>} record
 * @param {string[]} path
 * @param {*} value
 */
const setValueAtPath = (
  record,
  path,
  value,
) => {
  let current = record
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = cloneRecursive(value)
}

/**
 * Function to delete a value at a given path.
 * @param {Record<string, any>} record
 * @param {string[]} path
 */
const deleteValueAtPath = (
  record,
  path,
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

/**
 * Determine the differences between two objects.
 * @param {Record<string, any>} before
 * @param {Record<string, any>} after
 * @param {string[]} [path=[]]
 * @returns {Change[]}
 */
export const determineDiff = (
  before,
  after,
  path = [],
) => {
  const changes = []

  // Check for keys in the "before" object that are not in "after".
  for (const key in before) {
    const currentPath = [...path, key]

    if (!(key in after)) {
      changes.unshift({
        type: 'delete',
        path: currentPath,
        old: cloneRecursive(before[key]),
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
        old: cloneRecursive(before[key]),
        new: cloneRecursive(after[key]),
      })
    }
  }

  // Check for keys in the "after" object that were not in "before".
  for (const key in after) {
    if (!(key in before)) {
      changes.unshift({
        type: 'set',
        path: [...path, key],
        new: cloneRecursive(after[key]),
      })
    }
  }

  return changes
}

/**
 * Apply a diff to a state object.
 * @param {Record<string, any>} state
 * @param {Change[]} diff
 * @returns {Record<string, any>}
 */
export const applyDiff = (
  state,
  diff,
) => {
  for (const change of diff) {
    if (change.type === 'set') {
      setValueAtPath(state, change.path, change.new)
    } else if (change.type === 'delete') {
      deleteValueAtPath(state, change.path)
    }
  }
  return state
}

/**
 * Revert a diff on a state object.
 * @param {Record<string, any>} state
 * @param {Change[]} diff
 * @returns {Record<string, any>}
 */
export const revertDiff = (
  state,
  diff,
) => {
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
