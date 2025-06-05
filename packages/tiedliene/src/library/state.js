import {
  cloneRecursive,
} from '../utilities/clone.js'
import {
  determineDiff,
  applyDiff,
  revertDiff,
} from './diff.js'

/**
 * @typedef {import('./diff.js').Change} Change
 */

/**
 * @typedef {Object} ManageOptions Options for managing state.
 * @property {number} [maximumHistory] The maximum number of changes to keep in the undo and redo stacks.
 */

/**
 * Manages state and provides undo and redo functionality.
 *
 * @param {Record<string, any>} state The initial state.
 * @param {ManageOptions} [options] Options for managing state.
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
     * Returns the current state.
     *
     * @returns {Record<string, any>} The current state.
     */
    get: (
    ) => {
      return cloneRecursive(state)
    },

    /**
     * Sets the state and returns the new state.
     *
     * @param {Record<string, any>} newState The new state.
     * @returns {Record<string, any>} The new state.
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
     * Undoes the last change and returns the new state.
     *
     * @returns {Record<string, any>} The new state.
     */
    undo: (
    ) => {
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
     * Redoes the last change and returns the new state.
     *
     * @returns {Record<string, any>} The new state.
     */
    redo: (
    ) => {
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
