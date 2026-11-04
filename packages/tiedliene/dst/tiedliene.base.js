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
      throw new TypeError("Unsafe diff path component: __proto__");
    }
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
      const nextComponent = path[index + 1];
      current[key2] = typeof nextComponent === "number" ? [] : /* @__PURE__ */ Object.create(null);
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
    current[key] = cloneRecursive(value);
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
    if (key === "__proto__") {
      throw new TypeError("Unsafe diff path component: __proto__");
    }
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
    if (key === "__proto__") {
      throw new TypeError("Unsafe diff path component: __proto__");
    }
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
var applyDiff = (state, diff, trusted) => {
  validateDiff(diff);
  if (!trusted) {
    applyValidatedDiff(cloneRecursive(state), diff, false);
  }
  return applyValidatedDiff(state, diff, false);
};
var revertDiff = (state, diff, trusted) => {
  validateDiff(diff);
  if (!trusted) {
    applyValidatedDiff(cloneRecursive(state), diff, true);
  }
  return applyValidatedDiff(state, diff, true);
};
export {
  applyDiff,
  determineDiff,
  revertDiff
};
//# sourceMappingURL=tiedliene.base.js.map
