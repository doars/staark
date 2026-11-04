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
    const clone2 = value instanceof DataView ? new DataView(
      value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength
      )
    ) : new value.constructor(value);
    clones.set(value, clone2);
    return clone2;
  }
  const clone = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  clones.set(value, clone);
  for (const key of Object.keys(value)) {
    if (key === "__proto__") {
      Object.defineProperty(clone, key, {
        configurable: true,
        enumerable: true,
        value: cloneRecursive(value[key], clones),
        writable: true
      });
    } else {
      clone[key] = cloneRecursive(value[key], clones);
    }
  }
  return clone;
};

// src/library/diff.js
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
var valuesEqual = (before, after, inProgress) => {
  if (Object.is(before, after)) {
    return true;
  }
  if (!before || !after || typeof before !== "object" || typeof after !== "object") {
    return false;
  }
  if (before instanceof Date) {
    return after instanceof Date && before.getTime() === after.getTime();
  }
  if (ArrayBuffer.isView(before)) {
    if (!ArrayBuffer.isView(after) || before.constructor !== after.constructor || before.byteLength !== after.byteLength) {
      return false;
    }
    const beforeBytes = new Uint8Array(
      before.buffer,
      before.byteOffset,
      before.byteLength
    );
    const afterBytes = new Uint8Array(
      after.buffer,
      after.byteOffset,
      after.byteLength
    );
    for (let index = 0; index < beforeBytes.length; index++) {
      if (beforeBytes[index] !== afterBytes[index]) {
        return false;
      }
    }
    return true;
  }
  inProgress ??= /* @__PURE__ */ new Map();
  let afters = inProgress.get(before);
  if (afters?.has(after)) {
    return true;
  }
  if (!afters) {
    afters = /* @__PURE__ */ new Set();
    inProgress.set(before, afters);
  }
  afters.add(after);
  try {
    if (before instanceof Map || before instanceof Set) {
      if (before.constructor !== after.constructor || before.size !== after.size) {
        return false;
      }
      const unmatched = [...after];
      for (const beforeEntry of before) {
        const matchIndex = unmatched.findIndex(
          (afterEntry) => valuesEqual(beforeEntry, afterEntry, inProgress)
        );
        if (matchIndex < 0) {
          return false;
        }
        unmatched.splice(matchIndex, 1);
      }
      return true;
    }
    const keys = Object.keys(before);
    return isContainer(before) && isContainer(after) && Array.isArray(before) === Array.isArray(after) && keys.length === Object.keys(after).length && keys.every(
      (key) => Object.hasOwn(after, key) && valuesEqual(before[key], after[key], inProgress)
    );
  } finally {
    afters.delete(after);
  }
};
var getKey = (current, component) => {
  if (Array.isArray(current)) {
    if (typeof component === "number" || typeof component === "string" && ARRAY_INDEX.test(component)) {
      return Number(component);
    }
    throw new TypeError(
      `Invalid array index in diff path: ${String(component)}`
    );
  }
  return component;
};
var setValueAtPath = (record, path, value, inserting) => {
  if (!isContainer(record)) {
    throw new TypeError("Cannot traverse a non-record diff path value");
  }
  let current = record;
  for (let index = 0; index < path.length - 1; index++) {
    const key2 = getKey(current, path[index]);
    if (!Object.hasOwn(current, key2)) {
      Object.defineProperty(current, key2, {
        configurable: true,
        enumerable: true,
        value: typeof path[index + 1] === "number" ? [] : /* @__PURE__ */ Object.create(null),
        writable: true
      });
    }
    if (!isContainer(current[key2])) {
      throw new TypeError("Cannot traverse a non-record diff path value");
    }
    current = current[key2];
  }
  const key = getKey(current, path[path.length - 1]);
  if (inserting && Array.isArray(current)) {
    current.splice(key, 0, cloneRecursive(value));
  } else {
    Object.defineProperty(current, key, {
      configurable: true,
      enumerable: true,
      value: cloneRecursive(value),
      writable: true
    });
  }
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
  for (let index = 0; index < diff.length; index++) {
    const change = diff[reverting ? diff.length - index - 1 : index];
    if (reverting ? change.type === "delete" || Object.hasOwn(change, "old") : change.type === "set") {
      setValueAtPath(
        state,
        change.path,
        reverting ? change.old : change.new,
        change.type === "delete"
      );
    } else {
      deleteValueAtPath(state, change.path);
    }
  }
  return state;
};
var determineDiff = (before, after, path = [], paired = /* @__PURE__ */ new Map(), changes = []) => {
  const firstAfter = paired.get(before);
  if (firstAfter) {
    if (!valuesEqual(firstAfter, after)) {
      changes.push({
        type: "set",
        path,
        old: cloneRecursive(before),
        new: cloneRecursive(after)
      });
    }
    return changes;
  }
  paired.set(before, after);
  const isArray = Array.isArray(before);
  if (isArray !== Array.isArray(after)) {
    throw new TypeError("Cannot diff an array against an object");
  }
  const keys = isArray ? [...before.keys()] : Object.keys(before);
  for (let index = keys.length; index-- > 0; ) {
    const key = keys[index];
    if (isArray ? key >= after.length : !Object.hasOwn(after, key)) {
      changes.push({
        type: "delete",
        path: [...path, key],
        old: cloneRecursive(before[key])
      });
    } else if (isContainer(before[key]) && isContainer(after[key]) && Array.isArray(before[key]) === Array.isArray(after[key])) {
      determineDiff(before[key], after[key], [...path, key], paired, changes);
    } else if (!valuesEqual(before[key], after[key])) {
      changes.push({
        type: "set",
        path: [...path, key],
        old: cloneRecursive(before[key]),
        new: cloneRecursive(after[key])
      });
    }
  }
  for (const key of isArray ? [...after.keys()] : Object.keys(after)) {
    if (isArray ? key >= before.length : !Object.hasOwn(before, key)) {
      changes.push({
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
  options = Object.assign(
    {
      clone: cloneRecursive,
      maximumHistory: 50,
      snapshot: "clone"
    },
    options
  );
  if (!Number.isInteger(options.maximumHistory) || options.maximumHistory < 0) {
    throw new TypeError("maximumHistory must be a non-negative integer");
  }
  if (options.snapshot !== "clone" && options.snapshot !== "reference") {
    throw new TypeError("snapshot must be clone or reference");
  }
  if (typeof options.clone !== "function") {
    throw new TypeError("clone must be a function");
  }
  const validateState = (value, visited = /* @__PURE__ */ new WeakSet()) => {
    if (typeof value === "function") {
      throw new TypeError("Unsupported state value: function");
    }
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (value instanceof WeakMap || value instanceof WeakSet || typeof Node !== "undefined" && value instanceof Node) {
      throw new TypeError("Unsupported state value");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError("Unsupported symbol-keyed state");
    }
    if (value instanceof Date || ArrayBuffer.isView(value)) {
      return;
    }
    if (value instanceof Map) {
      for (const [key, entryValue] of value) {
        validateState(key, visited);
        validateState(entryValue, visited);
      }
      return;
    }
    if (value instanceof Set) {
      for (const entryValue of value) {
        validateState(entryValue, visited);
      }
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Unsupported custom state instance");
    }
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor?.get || descriptor?.set) {
        throw new TypeError("Unsupported enumerable state accessor");
      }
      validateState(value[key], visited);
    }
  };
  validateState(state);
  state = options.clone(state);
  const snapshot = () => options.snapshot === "reference" ? state : options.clone(state);
  const trusted = options.snapshot === "clone";
  const undoStack = [];
  const redoStack = [];
  return {
    /**
     * Returns the current state.
     *
     * @returns {Record<string, any>} The current state.
     */
    get: snapshot,
    /**
     * Sets the state and returns the new state.
     *
     * @param {Record<string, any>} newState The new state.
     * @returns {Record<string, any>} The new state.
     */
    set: (newState) => {
      validateState(newState);
      const diff = determineDiff(state, newState);
      if (diff.length > 0) {
        state = applyDiff(state, diff);
        undoStack.push(diff);
        if (undoStack.length > options.maximumHistory) {
          undoStack.shift();
        }
        redoStack.length = 0;
      }
      return snapshot();
    },
    /**
     * Undoes the last change and returns the new state.
     *
     * @returns {Record<string, any>} The new state.
     */
    undo: () => {
      if (undoStack.length > 0) {
        const diff = undoStack.at(-1);
        if (!trusted) {
          applyValidatedDiff(cloneRecursive(state), diff, true);
        }
        state = applyValidatedDiff(state, diff, true);
        redoStack.push(undoStack.pop());
      }
      return snapshot();
    },
    /**
     * Redoes the last change and returns the new state.
     *
     * @returns {Record<string, any>} The new state.
     */
    redo: () => {
      if (redoStack.length > 0) {
        const diff = redoStack.at(-1);
        if (!trusted) {
          applyValidatedDiff(cloneRecursive(state), diff, false);
        }
        state = applyValidatedDiff(state, diff, false);
        undoStack.push(redoStack.pop());
      }
      return snapshot();
    }
  };
};
export {
  applyDiff,
  cloneRecursive,
  determineDiff,
  manageState,
  revertDiff
};
//# sourceMappingURL=tiedliene.js.map
