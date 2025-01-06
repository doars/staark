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

  // src/attribute.ts
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

  // src/conditional.ts
  var conditional_exports = {};
  __export(conditional_exports, {
    conditional: () => conditional
  });
  var conditional = (condition, onTruth, onFalse) => {
    if (condition) {
      return arrayify(onTruth);
    }
    return arrayify(onFalse != null ? onFalse : []);
  };

  // src/element.ts
  var element_exports = {};
  __export(element_exports, {
    childrenToNodes: () => childrenToNodes
  });

  // src/node.ts
  var node_exports = {};
  __export(node_exports, {
    node: () => node
  });

  // src/marker.ts
  var marker_exports = {};
  __export(marker_exports, {
    marker: () => marker
  });
  var marker = Symbol();

  // src/node.ts
  var node = (type, attributesOrContents, contents) => {
    if (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents)) {
      contents = attributesOrContents;
      attributesOrContents = void 0;
    }
    return {
      _: marker,
      a: attributesOrContents,
      c: contents ? Array.isArray(contents) ? contents : [contents] : [],
      t: type.toUpperCase()
    };
  };

  // src/element.ts
  var childrenToNodes = (element) => {
    var _a;
    const abstractChildNodes = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childNode = element.childNodes[i];
      if (childNode instanceof Text) {
        abstractChildNodes.push(
          (_a = childNode.textContent) != null ? _a : ""
        );
      } else {
        let attributes = {};
        for (let i2 = 0; i2 < childNode.attributes.length; i2++) {
          const attribute = childNode.attributes[i2];
          attributes[attribute.name] = attribute.value;
        }
        abstractChildNodes.push(
          node(
            childNode.nodeName,
            attributes,
            childrenToNodes(childNode)
          )
        );
      }
    }
    return abstractChildNodes;
  };

  // src/factory.ts
  var factory_exports = {};
  __export(factory_exports, {
    factory: () => factory
  });
  var factory = new Proxy({}, {
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = (type[0] + type.substring(1).replace(
        /([A-Z])/g,
        (capital) => "-" + capital
      )).toUpperCase();
      return target[type] = (attributesOrContents, contents) => node(
        typeConverted,
        attributesOrContents,
        contents
      );
    }
  });

  // src/fctory.ts
  var fctory_exports = {};
  __export(fctory_exports, {
    fctory: () => fctory
  });

  // src/selector.ts
  var BRACKET_CLOSE = "]";
  var BRACKET_OPEN = "[";
  var DOT = ".";
  var EQUAL = "=";
  var HASH = "#";
  var QUOTE_SINGLE = "'";
  var QUOTE_DOUBLE = '"';
  var selectorToTokenizer = (selector) => {
    const length = selector.length;
    let i = 0;
    let type = "";
    const attributes = {};
    let tokenA = "";
    let tokenB = true;
    let tokenType = 3 /* type */;
    const storeToken = () => {
      if (tokenA) {
        switch (tokenType) {
          case 0 /* attribute */:
            attributes[tokenA] = tokenB === true ? true : tokenB;
            tokenB = true;
            break;
          case 1 /* class */:
            if (!attributes.class) {
              attributes.class = tokenA;
              break;
            }
            attributes.class += " " + tokenA;
            break;
          case 2 /* id */:
            attributes.id = tokenA;
            break;
          case 3 /* type */:
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
        tokenType = 2 /* id */;
        continue;
      } else if (character === DOT) {
        storeToken();
        tokenType = 1 /* class */;
        continue;
      } else if (character === BRACKET_OPEN) {
        storeToken();
        tokenType = 0 /* attribute */;
        parseAttribute();
        continue;
      }
      tokenA += character;
    }
    return [type, attributes];
  };

  // src/fctory.ts
  var fctory = new Proxy({}, {
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = (type[0] + type.substring(1).replace(
        /([A-Z])/g,
        (capital) => "-" + capital
      )).toUpperCase();
      return target[type] = (selector, contents) => {
        let attributes;
        if (selector) {
          const [_, _attributes] = selectorToTokenizer(selector);
          attributes = _attributes;
        }
        return node(
          typeConverted,
          attributes,
          contents
        );
      };
    }
  });

  // src/identifier.ts
  var identifier_exports = {};
  __export(identifier_exports, {
    uniqueIdentifier: () => uniqueIdentifier
  });
  var identifierCount = 0;
  var uniqueIdentifier = () => "-" + identifierCount++;

  // src/match.ts
  var match_exports = {};
  __export(match_exports, {
    match: () => match
  });
  var match = (pattern, lookup) => {
    if (lookup && pattern in lookup && lookup[pattern]) {
      return arrayify(lookup[pattern]);
    }
    return [];
  };

  // src/memo.ts
  var memo_exports = {};
  __export(memo_exports, {
    memo: () => memo
  });
  var memo = (render, memory) => ({
    _: marker,
    r: render,
    m: memory
  });

  // src/nde.ts
  var nde_exports = {};
  __export(nde_exports, {
    nde: () => nde
  });
  var nde = (selector, contents) => {
    const [type, attributes] = selectorToTokenizer(selector);
    return {
      _: marker,
      a: attributes,
      c: contents ? Array.isArray(contents) ? contents : [contents] : [],
      t: type.toUpperCase()
    };
  };

  // src/text.ts
  var text_exports = {};
  __export(text_exports, {
    text: () => text
  });
  var text = (contents) => ({
    _: marker,
    c: Array.isArray(contents) ? contents.join("") : "" + contents
  });

  // src/index.iife.ts
  iife([
    "staark",
    "common"
  ], {
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
    text: text_exports
  });
})();
//# sourceMappingURL=staark-common.iife.js.map
