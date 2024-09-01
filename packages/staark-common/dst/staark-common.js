// src/array.ts
var arrayify = function(data) {
  if (Array.isArray(data)) {
    return data;
  }
  return [
    data
  ];
};

// src/clone.ts
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
var identifierCount = 0;
var uniqueIdentifier = () => "-" + identifierCount++;

// src/node.ts
var SUFFIX_MULTIPLE = "[]";
var suffixNameIfMultiple = (attributes) => {
  if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
    attributes.name += SUFFIX_MULTIPLE;
  }
};
export {
  CREATED_EVENT,
  arrayify,
  cloneRecursive,
  equalRecursive,
  onCreated,
  suffixNameIfMultiple,
  uniqueIdentifier
};
//# sourceMappingURL=staark-common.js.map
