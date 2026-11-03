(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (!subject[path[i]] || typeof subject[path[i]] !== "object") {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

  // src/array.js
  var array_exports = {};
  __export(array_exports, {
    arrayify: () => arrayify,
    arrayifyOrUndefined: () => arrayifyOrUndefined
  });
  var arrayify = (data) => arrayifyOrUndefined(data) || [];
  var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

  // src/attribute.js
  var attribute_exports = {};
  __export(attribute_exports, {
    suffixNameIfMultiple: () => suffixNameIfMultiple
  });
  var SUFFIX_MULTIPLE = "[]";
  var suffixNameIfMultiple = (attributes) => {
    if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
      attributes.name += SUFFIX_MULTIPLE;
    }
  };

  // src/clone.js
  var clone_exports = {};
  __export(clone_exports, {
    cloneRecursive: () => cloneRecursive
  });
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

  // src/compare.js
  var compare_exports = {};
  __export(compare_exports, {
    equalPlain: () => equalPlain,
    equalRecursive: () => equalRecursive
  });
  var equalRecursive = (valueA, valueB, compared) => {
    if (valueA === valueB) {
      return true;
    }
    if (!valueA || !valueB || typeof valueA !== "object" || typeof valueB !== "object") {
      return valueA === valueB;
    }
    if (valueA instanceof Date) {
      return valueB instanceof Date && valueA.getTime() === valueB.getTime();
    }
    if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
      return false;
    }
    compared ??= /* @__PURE__ */ new WeakMap();
    let comparedWithA = compared.get(valueA);
    if (comparedWithA?.has(valueB)) {
      return true;
    }
    if (!comparedWithA) {
      comparedWithA = /* @__PURE__ */ new WeakSet();
      compared.set(valueA, comparedWithA);
    }
    comparedWithA.add(valueB);
    if (valueA instanceof Map) {
      if (!(valueB instanceof Map) || valueA.size !== valueB.size) return false;
      for (const [key, entryValue] of valueA) {
        if (!valueB.has(key) || !equalRecursive(entryValue, valueB.get(key), compared)) {
          return false;
        }
      }
      return true;
    }
    if (valueA instanceof Set) {
      if (!(valueB instanceof Set) || valueA.size !== valueB.size) return false;
      for (const entryValue of valueA) {
        if (!valueB.has(entryValue)) return false;
      }
      return true;
    }
    if (ArrayBuffer.isView(valueA)) {
      if (!ArrayBuffer.isView(valueB) || valueA.constructor !== valueB.constructor || valueA.byteLength !== valueB.byteLength)
        return false;
      const bytesA = new Uint8Array(
        valueA.buffer,
        valueA.byteOffset,
        valueA.byteLength
      );
      const bytesB = new Uint8Array(
        valueB.buffer,
        valueB.byteOffset,
        valueB.byteLength
      );
      for (let index = 0; index < bytesA.length; index++) {
        if (bytesA[index] !== bytesB[index]) return false;
      }
      return true;
    }
    const keys = Object.keys(valueA);
    return keys.length === Object.keys(valueB).length && keys.every(
      (key) => Object.hasOwn(valueB, key) && equalRecursive(valueA[key], valueB[key], compared)
    );
  };
  var equalPlain = (valueA, valueB, path) => {
    if (valueA === valueB) {
      return true;
    }
    if (!valueA || !valueB || typeof valueA !== "object" || typeof valueB !== "object") {
      return false;
    }
    if (valueA instanceof Date) {
      return valueB instanceof Date && valueA.getTime() === valueB.getTime();
    }
    const prototype = Object.getPrototypeOf(valueA);
    path ??= [];
    if (prototype !== Object.getPrototypeOf(valueB) || prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null || path.includes(valueA)) {
      return false;
    }
    path.push(valueA);
    const keys = Object.keys(valueA);
    const equal = keys.length === Object.keys(valueB).length && keys.every(
      (key) => Object.hasOwn(valueB, key) && equalPlain(valueA[key], valueB[key], path)
    );
    path.pop();
    return equal;
  };

  // src/conditional.js
  var conditional_exports = {};
  __export(conditional_exports, {
    conditional: () => conditional
  });
  var conditional = (condition, onTruth, onFalse) => {
    let result = condition ? onTruth : onFalse;
    if (typeof result === "function") {
      result = result();
    }
    return arrayify(result);
  };

  // src/element.js
  var element_exports = {};
  __export(element_exports, {
    childrenToNodes: () => childrenToNodes
  });

  // src/node.js
  var node_exports = {};
  __export(node_exports, {
    node: () => node
  });

  // src/marker.js
  var marker_exports = {};
  __export(marker_exports, {
    marker: () => marker
  });
  var marker = "n";

  // src/node.js
  var node = (type, attributesOrContents, contents) => {
    if (attributesOrContents && (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents))) {
      contents = attributesOrContents;
      attributesOrContents = void 0;
    }
    return {
      _: marker,
      a: attributesOrContents,
      c: arrayifyOrUndefined(contents),
      t: type
    };
  };

  // src/element.js
  var childrenToNodes = (element) => {
    const abstractChildNodes = [];
    for (const childNode of element.childNodes) {
      if (childNode instanceof Text) {
        abstractChildNodes.push(childNode.textContent ?? "");
      } else {
        const attributes = {};
        for (const attribute of childNode.attributes ?? []) {
          attributes[attribute.name] = attribute.value;
        }
        abstractChildNodes.push(
          node(
            childNode.localName ?? childNode.nodeName,
            attributes,
            childrenToNodes(childNode)
          )
        );
      }
    }
    return abstractChildNodes;
  };

  // src/factory.js
  var factory_exports = {};
  __export(factory_exports, {
    factory: () => factory
  });

  // src/selector.js
  var BRACKET_CLOSE = "]";
  var BRACKET_OPEN = "[";
  var DOT = ".";
  var EQUAL = "=";
  var HASH = "#";
  var QUOTE_SINGLE = "'";
  var QUOTE_DOUBLE = '"';
  var propertyNameToType = (propertyName) => propertyName[0].toLowerCase() + propertyName.substring(1).replace(/([A-Z])/g, (capital) => `-${capital.toLowerCase()}`);
  var selectorToTokenizer = (selector) => {
    const length = selector.length;
    let i = 0;
    let type = "";
    const attributes = {};
    let tokenA = "";
    let tokenB = true;
    let tokenType;
    const storeToken = () => {
      if (tokenA) {
        switch (tokenType) {
          case BRACKET_OPEN:
            attributes[tokenA] = tokenB === true ? true : tokenB;
            tokenB = true;
            break;
          case DOT:
            if (!attributes.class) {
              attributes.class = tokenA;
              break;
            }
            attributes.class += ` ${tokenA}`;
            break;
          case HASH:
            attributes.id = tokenA;
            break;
          default:
            type = tokenA;
            break;
        }
        tokenA = "";
      }
    };
    let character;
    let attributeBracketCount;
    const parseAttribute = () => {
      attributeBracketCount = 0;
      while (i < length) {
        character = selector[i];
        i++;
        if (character === EQUAL) {
          tokenB = "";
          character = selector[i];
          const endOnDoubleQuote = character === QUOTE_DOUBLE;
          const endOnSingleQuote = character === QUOTE_SINGLE;
          if (endOnDoubleQuote || endOnSingleQuote) {
            tokenB += character;
            i++;
          }
          while (i < length) {
            character = selector[i];
            if (endOnDoubleQuote && character === QUOTE_DOUBLE || endOnSingleQuote && character === QUOTE_SINGLE) {
              tokenB += character;
              i++;
              break;
            } else if (!endOnDoubleQuote && !endOnSingleQuote && character === BRACKET_CLOSE) {
              break;
            }
            tokenB += character;
            i++;
          }
          if (tokenB[0] === QUOTE_DOUBLE && tokenB[tokenB.length - 1] === QUOTE_DOUBLE || tokenB[0] === QUOTE_SINGLE && tokenB[tokenB.length - 1] === QUOTE_SINGLE) {
            tokenB = tokenB.substring(1, tokenB.length - 1);
          }
          while (i < length) {
            character = selector[i];
            i++;
            if (character === BRACKET_CLOSE) {
              break;
            }
          }
          break;
        } else if (character === BRACKET_OPEN) {
          attributeBracketCount++;
          continue;
        } else if (character === BRACKET_CLOSE) {
          attributeBracketCount--;
          if (attributeBracketCount < 0) {
            break;
          }
          continue;
        }
        tokenA += character;
      }
      storeToken();
    };
    while (i < length) {
      character = selector[i];
      i++;
      if (character === HASH) {
        storeToken();
        tokenType = HASH;
        continue;
      } else if (character === DOT) {
        storeToken();
        tokenType = DOT;
        continue;
      } else if (character === BRACKET_OPEN) {
        storeToken();
        tokenType = BRACKET_OPEN;
        parseAttribute();
        continue;
      }
      tokenA += character;
    }
    storeToken();
    return [type, attributes];
  };

  // src/factory.js
  var factory = /* @__PURE__ */ new Proxy(
    {},
    {
      /**
       * @param {FactoryCache} target Factory cache.
       * @param {string} type Type of the nodes to generate.
       * @returns {Factory} Function that generates the a node with the given type.
       */
      get: (target, type) => {
        if (target[type]) {
          return target[type];
        }
        const typeConverted = propertyNameToType(type);
        return target[type] = (attributesOrContents, contents) => node(typeConverted, attributesOrContents, contents);
      }
    }
  );

  // src/fctory.js
  var fctory_exports = {};
  __export(fctory_exports, {
    fctory: () => fctory
  });
  var fctory = /* @__PURE__ */ new Proxy(
    {},
    {
      /**
       * @param {FctoryCache} target Factory cache.
       * @param {string} type Type of the nodes to generate.
       * @returns {Fctory} Function that generates the a node with the given type.
       */
      get: (target, type) => {
        if (target[type]) {
          return target[type];
        }
        const typeConverted = propertyNameToType(type);
        return target[type] = (selector, contents) => {
          let attributes;
          if (selector) {
            attributes = selectorToTokenizer(selector)[1];
          }
          return node(typeConverted, attributes, contents);
        };
      }
    }
  );

  // src/identifier.js
  var identifier_exports = {};
  __export(identifier_exports, {
    identifier: () => identifier
  });
  var identifierCount = 0;
  var identifier = (prefix) => `${prefix}-${identifierCount++}`;

  // src/match.js
  var match_exports = {};
  __export(match_exports, {
    match: () => match
  });
  var match = (key, lookup, fallback) => {
    let result;
    if (lookup && key in lookup && lookup[key]) {
      result = lookup[key];
    } else {
      result = fallback;
    }
    if (typeof result === "function") {
      result = result();
    }
    return arrayify(result);
  };

  // src/memo.js
  var memo_exports = {};
  __export(memo_exports, {
    memo: () => memo
  });
  var memo = (render, memory) => ({
    _: marker,
    r: render,
    m: memory
  });

  // src/nde.js
  var nde_exports = {};
  __export(nde_exports, {
    nde: () => nde
  });
  var nde = (selector, contents) => {
    const [type, attributes] = selectorToTokenizer(selector);
    return {
      _: marker,
      a: attributes,
      c: arrayifyOrUndefined(contents),
      t: type
    };
  };

  // src/sequence.js
  var sequence_exports = {};
  __export(sequence_exports, {
    increasingSubsequence: () => increasingSubsequence
  });
  var increasingSubsequence = (sources) => {
    const tails = [];
    const previous = [];
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index];
      if (source === void 0) {
        continue;
      }
      let low = 0;
      let high = tails.length;
      while (low < high) {
        const middle = low + high >> 1;
        if (sources[tails[middle]] < source) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }
      previous[index] = low ? tails[low - 1] : -1;
      tails[low] = index;
    }
    const included = [];
    for (let index = tails[tails.length - 1]; index >= 0; index = previous[index]) {
      included[index] = true;
    }
    return included;
  };

  // src/index.iife.js
  iife(["staark", "common"], {
    array: array_exports,
    attribute: attribute_exports,
    clone: clone_exports,
    compare: compare_exports,
    conditional: conditional_exports,
    element: element_exports,
    factory: factory_exports,
    fctory: fctory_exports,
    identifier: identifier_exports,
    marker: marker_exports,
    match: match_exports,
    memo: memo_exports,
    nde: nde_exports,
    node: node_exports,
    sequence: sequence_exports
  });
})();
//# sourceMappingURL=staark-common.iife.js.map
