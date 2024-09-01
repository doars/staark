"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../../.scripts/iife.ts
  var iife = function(path, data) {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

  // src/array.ts
  var array_exports = {};
  __export(array_exports, {
    arrayify: () => arrayify
  });
  var arrayify = function(data) {
    if (Array.isArray(data)) {
      return data;
    }
    return [
      data
    ];
  };

  // src/clone.ts
  var clone_exports = {};
  __export(clone_exports, {
    cloneRecursive: () => cloneRecursive
  });
  var cloneRecursive = (value) => {
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        const clone = [];
        for (let i = 0; i < value.length; i++) {
          clone.push(cloneRecursive(value[i]));
        }
        value = clone;
      } else {
        const clone = {};
        for (const key in value) {
          clone[key] = cloneRecursive(value[key]);
        }
        value = clone;
      }
    }
    return value;
  };

  // src/compare.ts
  var compare_exports = {};
  __export(compare_exports, {
    equalRecursive: () => equalRecursive
  });
  var equalRecursive = (valueA, valueB) => {
    if (valueA === valueB) {
      return true;
    }
    if (valueA instanceof Date && valueB instanceof Date) {
      return valueA.getTime() === valueB.getTime();
    }
    if (!valueA || !valueB || typeof valueA !== "object" && typeof valueB !== "object") {
      return valueA === valueB;
    }
    if (valueA === null || valueA === void 0 || valueB === null || valueB === void 0) {
      return false;
    }
    if (valueA.prototype !== valueB.prototype) {
      return false;
    }
    let keys = Object.keys(valueA);
    if (keys.length !== Object.keys(valueB).length) {
      return false;
    }
    return keys.every(
      (key) => equalRecursive(valueA[key], valueB[key])
    );
  };

  // src/element.ts
  var element_exports = {};
  __export(element_exports, {
    CREATED_EVENT: () => CREATED_EVENT,
    onCreated: () => onCreated
  });
  var CREATED_EVENT = "staark-created";
  var onCreated = (id, callback) => {
    const handleEvent = (event) => {
      if (event.detail.target.getAttribute("id") === id) {
        document.body.removeEventListener(
          CREATED_EVENT,
          handleEvent
        );
        callback(event);
      }
    };
    document.body.addEventListener(
      CREATED_EVENT,
      handleEvent
    );
  };

  // src/identifier.ts
  var identifier_exports = {};
  __export(identifier_exports, {
    uniqueIdentifier: () => uniqueIdentifier
  });
  var identifierCount = 0;
  var uniqueIdentifier = () => "-" + identifierCount++;

  // src/node.ts
  var node_exports = {};
  __export(node_exports, {
    suffixNameIfMultiple: () => suffixNameIfMultiple
  });
  var SUFFIX_MULTIPLE = "[]";
  var suffixNameIfMultiple = (attributes) => {
    if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
      attributes.name += SUFFIX_MULTIPLE;
    }
  };

  // src/index.iife.ts
  iife([
    "staark",
    "common"
  ], {
    array: array_exports,
    clone: clone_exports,
    compare: compare_exports,
    element: element_exports,
    identifier: identifier_exports,
    node: node_exports
  });
})();
//# sourceMappingURL=staark-common.iife.js.map
