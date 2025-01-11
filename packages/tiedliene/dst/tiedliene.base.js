// src/library/diff.ts
var setValueAtPath = (record, path, value) => {
  let current = record;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = structuredClone(value);
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
        old: structuredClone(before[key])
      });
    } else if (typeof before[key] === "object" && typeof after[key] === "object") {
      changes.unshift(
        ...determineDiff(before[key], after[key], currentPath)
      );
    } else if (before[key] !== after[key]) {
      changes.unshift({
        type: "set",
        path: currentPath,
        old: structuredClone(before[key]),
        new: structuredClone(after[key])
      });
    }
  }
  for (const key in after) {
    if (!(key in before)) {
      changes.unshift({
        type: "set",
        path: [...path, key],
        new: structuredClone(after[key])
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
export {
  applyDiff,
  determineDiff,
  revertDiff
};
//# sourceMappingURL=tiedliene.base.js.map
