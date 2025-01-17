import {
  Change,
  determineDiff,
  applyDiff,
  revertDiff,
} from './diff.js'

interface ManageOptions {
  maximumHistory?: number,
}

export const manageState = function (
  state: Record<string, any>,
  options?: ManageOptions,
) {
  state = structuredClone(state)
  options = Object.assign({
    maximumHistory: 50,
  }, options)

  const undoStack: Change[][] = []
  const redoStack: Change[][] = []

  return {
    get: (
    ) => {
      return structuredClone(state)
    },

    set: (
      newState: Record<string, any>,
    ) => {
      newState = structuredClone(newState)

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
      return structuredClone(state)
    },

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

      return structuredClone(state)
    },

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

      return structuredClone(state)
    },
  }
}
