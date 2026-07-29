(() => {
  // src/utilities/clone.js
  var cloneRecursive = (value, clones = /* @__PURE__ */ new WeakMap()) => {
    if (!value || typeof value !== "object") {
      return value;
    }
    if (clones.has(value)) {
      return clones.get(value);
    }
    if (value instanceof Date) {
      const clone2 = new Date(value.getTime());
      clones.set(value, clone2);
      return clone2;
    }
    if (value instanceof Map) {
      const clone2 = /* @__PURE__ */ new Map();
      clones.set(value, clone2);
      for (const [key, entryValue] of value) {
        clone2.set(
          cloneRecursive(key, clones),
          cloneRecursive(entryValue, clones)
        );
      }
      return clone2;
    }
    if (value instanceof Set) {
      const clone2 = /* @__PURE__ */ new Set();
      clones.set(value, clone2);
      for (const entryValue of value) {
        clone2.add(cloneRecursive(entryValue, clones));
      }
      return clone2;
    }
    if (ArrayBuffer.isView(value)) {
      const clone2 = new value.constructor(value);
      clones.set(value, clone2);
      return clone2;
    }
    const clone = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    clones.set(value, clone);
    for (const key of Object.keys(value)) {
      clone[key] = cloneRecursive(value[key], clones);
    }
    return clone;
  };

  // src/library/diff.js
  var FORBIDDEN_PATH_COMPONENTS = /* @__PURE__ */ new Set([
    "__proto__",
    "constructor",
    "prototype"
  ]);
  var ARRAY_INDEX = /^(0|[1-9]\d*)$/;
  var validatePath = (path) => {
    if (!Array.isArray(path) || path.length === 0) {
      throw new TypeError("Diff paths must be non-empty arrays");
    }
    for (const component of path) {
      if (typeof component !== "string" && (!Number.isInteger(component) || component < 0)) {
        throw new TypeError(
          "Diff path components must be strings or array indices"
        );
      }
      if (FORBIDDEN_PATH_COMPONENTS.has(String(component))) {
        throw new TypeError(`Unsafe diff path component: ${String(component)}`);
      }
    }
    return path;
  };
  var validateDiff = (diff) => {
    if (!Array.isArray(diff)) {
      throw new TypeError("Diff must be an array");
    }
    for (const change of diff) {
      if (!change || typeof change !== "object" || change.type !== "set" && change.type !== "delete") {
        throw new TypeError("Diff entries must be set or delete changes");
      }
      validatePath(change.path);
    }
    return diff;
  };
  var isContainer = (value) => value !== null && typeof value === "object" && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  var getKey = (current, component) => {
    if (Array.isArray(current)) {
      if (typeof component === "number" && component >= 0 || typeof component === "string" && ARRAY_INDEX.test(component)) {
        return Number(component);
      }
      throw new TypeError(
        `Invalid array index in diff path: ${String(component)}`
      );
    }
    return component;
  };
  var setValueAtPath = (record, path, value) => {
    let current = record;
    for (let index = 0; index < path.length - 1; index++) {
      if (!isContainer(current)) {
        throw new TypeError("Cannot traverse a non-record diff path value");
      }
      const key = getKey(current, path[index]);
      if (!Object.hasOwn(current, key)) {
        const nextComponent = path[index + 1];
        current[key] = typeof nextComponent === "number" ? [] : /* @__PURE__ */ Object.create(null);
      }
      if (!isContainer(current[key])) {
        throw new TypeError("Cannot traverse a non-record diff path value");
      }
      current = current[key];
    }
    if (!isContainer(current)) {
      throw new TypeError("Cannot set a value on a non-record diff path value");
    }
    current[getKey(current, path[path.length - 1])] = cloneRecursive(value);
  };
  var deleteValueAtPath = (record, path) => {
    let current = record;
    for (let index = 0; index < path.length - 1; index++) {
      if (!isContainer(current)) {
        throw new TypeError("Cannot traverse a non-record diff path value");
      }
      const key2 = getKey(current, path[index]);
      if (!Object.hasOwn(current, key2)) {
        return;
      }
      current = current[key2];
    }
    if (!isContainer(current)) {
      throw new TypeError(
        "Cannot delete a value on a non-record diff path value"
      );
    }
    const key = getKey(current, path[path.length - 1]);
    if (Array.isArray(current)) {
      current.splice(key, 1);
    } else {
      delete current[key];
    }
  };
  var applyValidatedDiff = (state, diff, reverting) => {
    for (const change of diff) {
      if (reverting) {
        if (change.type === "set") {
          if (change.old === void 0) {
            deleteValueAtPath(state, change.path);
          } else {
            setValueAtPath(state, change.path, change.old);
          }
        } else {
          setValueAtPath(state, change.path, change.old);
        }
      } else if (change.type === "set") {
        setValueAtPath(state, change.path, change.new);
      } else {
        deleteValueAtPath(state, change.path);
      }
    }
    return state;
  };
  var determineDiff = (before, after, path = [], compared = /* @__PURE__ */ new WeakMap()) => {
    const changes = [];
    if (before && after && typeof before === "object" && typeof after === "object") {
      let comparedAfter = compared.get(before);
      if (comparedAfter?.has(after)) {
        return changes;
      }
      if (!comparedAfter) {
        comparedAfter = /* @__PURE__ */ new WeakSet();
        compared.set(before, comparedAfter);
      }
      comparedAfter.add(after);
    }
    for (const key of Object.keys(before)) {
      const currentPath = [...path, key];
      if (!Object.hasOwn(after, key)) {
        changes.unshift({
          type: "delete",
          path: currentPath,
          old: cloneRecursive(before[key])
        });
      } else if (before[key] && after[key] && typeof before[key] === "object" && typeof after[key] === "object") {
        changes.unshift(
          ...determineDiff(before[key], after[key], currentPath, compared)
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
    for (const key of Object.keys(after)) {
      if (!Object.hasOwn(before, key)) {
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
    validateDiff(diff);
    applyValidatedDiff(cloneRecursive(state), diff, false);
    return applyValidatedDiff(state, diff, false);
  };
  var revertDiff = (state, diff) => {
    validateDiff(diff);
    applyValidatedDiff(cloneRecursive(state), diff, true);
    return applyValidatedDiff(state, diff, true);
  };

  // src/library/state.js
  var manageState = (state, options) => {
    state = cloneRecursive(state);
    options = Object.assign(
      {
        maximumHistory: 50
      },
      options
    );
    const undoStack = [];
    const redoStack = [];
    return {
      /**
       * Returns the current state.
       *
       * @returns {Record<string, any>} The current state.
       */
      get: () => {
        return cloneRecursive(state);
      },
      /**
       * Sets the state and returns the new state.
       *
       * @param {Record<string, any>} newState The new state.
       * @returns {Record<string, any>} The new state.
       */
      set: (newState) => {
        newState = cloneRecursive(newState);
        const diffs = determineDiff(state, newState);
        if (diffs.length > 0) {
          undoStack.push(diffs);
          if (options.maximumHistory && undoStack.length > options.maximumHistory) {
            undoStack.splice(0, undoStack.length - options.maximumHistory);
          }
          redoStack.splice(0);
        }
        state = newState;
        return cloneRecursive(state);
      },
      /**
       * Undoes the last change and returns the new state.
       *
       * @returns {Record<string, any>} The new state.
       */
      undo: () => {
        if (undoStack.length > 0) {
          const lastDiffs = undoStack.pop();
          if (lastDiffs) {
            redoStack.push(lastDiffs);
            if (options.maximumHistory && redoStack.length > options.maximumHistory) {
              redoStack.splice(0, redoStack.length - options.maximumHistory);
            }
            state = revertDiff(state, lastDiffs);
          }
        }
        return cloneRecursive(state);
      },
      /**
       * Redoes the last change and returns the new state.
       *
       * @returns {Record<string, any>} The new state.
       */
      redo: () => {
        if (redoStack.length > 0) {
          const diffs = redoStack.pop();
          if (diffs) {
            undoStack.push(diffs);
            if (options.maximumHistory && undoStack.length > options.maximumHistory) {
              undoStack.splice(0, undoStack.length - options.maximumHistory);
            }
            state = applyDiff(state, diffs);
          }
        }
        return cloneRecursive(state);
      }
    };
  };
})();
//# sourceMappingURL=tiedliene.js.map
