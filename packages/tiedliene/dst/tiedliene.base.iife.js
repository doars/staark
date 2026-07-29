(() => {
  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

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
  var valuesEqual = (before, after, compared = /* @__PURE__ */ new WeakMap()) => {
    if (Object.is(before, after)) {
      return true;
    }
    if (!before || !after || typeof before !== "object" || typeof after !== "object") {
      return false;
    }
    let comparedAfter = compared.get(before);
    if (comparedAfter?.has(after)) {
      return true;
    }
    if (!comparedAfter) {
      comparedAfter = /* @__PURE__ */ new WeakSet();
      compared.set(before, comparedAfter);
    }
    comparedAfter.add(after);
    if (before instanceof Date || after instanceof Date) {
      return before instanceof Date && after instanceof Date && before.getTime() === after.getTime();
    }
    if (ArrayBuffer.isView(before) || ArrayBuffer.isView(after)) {
      if (!ArrayBuffer.isView(before) || !ArrayBuffer.isView(after) || before.constructor !== after.constructor || before.byteLength !== after.byteLength) {
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
    if (before instanceof Map || after instanceof Map) {
      if (!(before instanceof Map) || !(after instanceof Map) || before.size !== after.size) {
        return false;
      }
      const unmatchedEntries = [...after];
      for (const [beforeKey, beforeValue] of before) {
        let matchIndex = -1;
        for (let index = 0; index < unmatchedEntries.length; index++) {
          const [afterKey, afterValue] = unmatchedEntries[index];
          if (valuesEqual(beforeKey, afterKey, /* @__PURE__ */ new WeakMap()) && valuesEqual(beforeValue, afterValue, /* @__PURE__ */ new WeakMap())) {
            matchIndex = index;
            break;
          }
        }
        if (matchIndex < 0) {
          return false;
        }
        unmatchedEntries.splice(matchIndex, 1);
      }
      return true;
    }
    if (before instanceof Set || after instanceof Set) {
      if (!(before instanceof Set) || !(after instanceof Set) || before.size !== after.size) {
        return false;
      }
      const unmatchedValues = [...after];
      for (const beforeValue of before) {
        const matchIndex = unmatchedValues.findIndex(
          (afterValue) => valuesEqual(beforeValue, afterValue, /* @__PURE__ */ new WeakMap())
        );
        if (matchIndex < 0) {
          return false;
        }
        unmatchedValues.splice(matchIndex, 1);
      }
      return true;
    }
    return false;
  };
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
      } else if (isContainer(before[key]) && isContainer(after[key])) {
        changes.unshift(
          ...determineDiff(before[key], after[key], currentPath, compared)
        );
      } else if (!valuesEqual(before[key], after[key])) {
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

  // src/index.base.iife.js
  iife(["tiedliene"], {
    determineDiff,
    applyDiff,
    revertDiff
  });
})();
//# sourceMappingURL=tiedliene.base.iife.js.map
