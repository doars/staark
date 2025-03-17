import { cloneRecursive } from '../utilities/clone.js'

import {
  determineDiff,
  applyDiff,
  revertDiff,
} from './diff.js'

/**
 * @typedef {import('./diff.js').Change} Change
 */

/**
 * @typedef {Object} ManageOptions
 * @property {number} [maximumHistory]
 */

/**
 * @param {Record<string, any>} state
 * @param {ManageOptions} [options]
 */
export const manageState = function (
  state,
  options,
) {
  state = cloneRecursive(state)
  options = Object.assign({
    maximumHistory: 50,
  }, options)

  /** @type {Change[][]} */
  const undoStack = []
  /** @type {Change[][]} */
  const redoStack = []

  return {
    /**
     * @returns {Record<string, any>}
     */
    get: () => {
      return cloneRecursive(state)
    },

    /**
     * @param {Record<string, any>} newState
     * @returns {Record<string, any>}
     */
    set: (
      newState,
    ) => {
      newState = cloneRecursive(newState)

      const diffs = determineDiff(state, newState)
      if (diffs.length > 0) {
        undoStack.push(diffs)

        // Cap stack size.
        if (
          options.maximumHistory
          && undoStack.length > options.maximumHistory
        ) {
          for (let i = undoStack.length - options.maximumHistory; i > 0; i--) {
            undoStack.shift()
          }
        }

        // Clear the redo stack when a new state is set.
        redoStack.splice(0)
      }

      state = newState
      return cloneRecursive(state)
    },

    /**
     * @returns {Record<string, any>}
     */
    undo: () => {
      if (undoStack.length > 0) {
        const lastDiffs = undoStack.pop()
        if (lastDiffs) {
          redoStack.push(lastDiffs)

          // Cap stack size.
          if (
            options.maximumHistory
            && redoStack.length > options.maximumHistory
          ) {
            for (let i = redoStack.length - options.maximumHistory; i > 0; i--) {
              redoStack.shift()
            }
          }

          state = revertDiff(state, lastDiffs)
        }
      }

      return cloneRecursive(state)
    },

    /**
     * @returns {Record<string, any>}
     */
    redo: () => {
      if (redoStack.length > 0) {
        const diffs = redoStack.pop()
        if (diffs) {
          undoStack.push(diffs)

          // Cap stack size.
          if (
            options.maximumHistory
            && undoStack.length > options.maximumHistory
          ) {
            for (let i = undoStack.length - options.maximumHistory; i > 0; i--) {
              undoStack.shift()
            }
          }

          state = applyDiff(state, diffs)
        }
      }

      return cloneRecursive(state)
    },
  }
}
