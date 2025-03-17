// src/utilities/clone.js
var cloneRecursive = (value) => {
  if (typeof value === "object") {
    const clone = Array.isArray(value) ? [] : {};
    for (const key in value) {
      clone[key] = cloneRecursive(value[key]);
    }
    return clone;
  }
  return value;
};

// src/library/diff.js
var setValueAtPath = (record, path, value) => {
  let current = record;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = cloneRecursive(value);
};
var deleteValueAtPath = (record, path) => {
  let current = record;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
    if (!current) {
      return;
    }
  }
  if (Array.isArray(current)) {
    current.splice(parseInt(path[path.length - 1]), 1);
  } else {
    delete current[path[path.length - 1]];
  }
};
var determineDiff = (before, after, path = []) => {
  const changes = [];
  for (const key in before) {
    const currentPath = [...path, key];
    if (!(key in after)) {
      changes.unshift({
        type: "delete",
        path: currentPath,
        old: cloneRecursive(before[key])
      });
    } else if (typeof before[key] === "object" && typeof after[key] === "object") {
      changes.unshift(
        ...determineDiff(before[key], after[key], currentPath)
      );
    } else if (before[key] !== after[key]) {
      changes.unshift({
        type: "set",
        path: currentPath,
        old: cloneRecursive(before[key]),
        new: cloneRecursive(after[key])
      });
    }
  }
  for (const key in after) {
    if (!(key in before)) {
      changes.unshift({
        type: "set",
        path: [...path, key],
        new: cloneRecursive(after[key])
      });
    }
  }
  return changes;
};
var applyDiff = (state, diff) => {
  for (const change of diff) {
    if (change.type === "set") {
      setValueAtPath(state, change.path, change.new);
    } else if (change.type === "delete") {
      deleteValueAtPath(state, change.path);
    }
  }
  return state;
};
var revertDiff = (state, diff) => {
  for (const change of diff) {
    if (change.type === "set") {
      if (change.old === void 0) {
        deleteValueAtPath(state, change.path);
      } else {
        setValueAtPath(state, change.path, change.old);
      }
    } else if (change.type === "delete") {
      setValueAtPath(state, change.path, change.old);
    }
  }
  return state;
};

// src/library/state.js
var manageState = function(state, options) {
  state = cloneRecursive(state);
  options = Object.assign({
    maximumHistory: 50
  }, options);
  const undoStack = [];
  const redoStack = [];
  return {
    /**
     * @returns {Record<string, any>}
     */
    get: () => {
      return cloneRecursive(state);
    },
    /**
     * @param {Record<string, any>} newState
     * @returns {Record<string, any>}
     */
    set: (newState) => {
      newState = cloneRecursive(newState);
      const diffs = determineDiff(state, newState);
      if (diffs.length > 0) {
        undoStack.push(diffs);
        if (options.maximumHistory && undoStack.length > options.maximumHistory) {
          for (let i = undoStack.length - options.maximumHistory; i > 0; i--) {
            undoStack.shift();
          }
        }
        redoStack.splice(0);
      }
      state = newState;
      return cloneRecursive(state);
    },
    /**
     * @returns {Record<string, any>}
     */
    undo: () => {
      if (undoStack.length > 0) {
        const lastDiffs = undoStack.pop();
        if (lastDiffs) {
          redoStack.push(lastDiffs);
          if (options.maximumHistory && redoStack.length > options.maximumHistory) {
            for (let i = redoStack.length - options.maximumHistory; i > 0; i--) {
              redoStack.shift();
            }
          }
          state = revertDiff(state, lastDiffs);
        }
      }
      return cloneRecursive(state);
    },
    /**
     * @returns {Record<string, any>}
     */
    redo: () => {
      if (redoStack.length > 0) {
        const diffs = redoStack.pop();
        if (diffs) {
          undoStack.push(diffs);
          if (options.maximumHistory && undoStack.length > options.maximumHistory) {
            for (let i = undoStack.length - options.maximumHistory; i > 0; i--) {
              undoStack.shift();
            }
          }
          state = applyDiff(state, diffs);
        }
      }
      return cloneRecursive(state);
    }
  };
};
export {
  applyDiff,
  determineDiff,
  manageState,
  revertDiff
};
//# sourceMappingURL=tiedliene.js.map
