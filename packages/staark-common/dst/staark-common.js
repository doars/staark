// src/array.js
var arrayify = (data) => arrayifyOrUndefined(data) || [];
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

// src/attribute.js
var SUFFIX_MULTIPLE = "[]";
var suffixNameIfMultiple = (attributes) => {
  if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
    attributes.name += SUFFIX_MULTIPLE;
  }
};

// src/clone.js
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

// src/compare.js
var equalRecursive = (valueA, valueB) => {
  if (valueA === valueB) {
    return true;
  }
  if (!valueA || !valueB || typeof valueA !== "object" || typeof valueB !== "object") {
    return valueA === valueB;
  }
  if (valueA instanceof Date) {
    return valueB instanceof Date && valueA.getTime() === valueB.getTime();
  }
  const keys = Object.keys(valueA);
  return keys.length === Object.keys(valueB).length && keys.every((k) => equalRecursive(valueA[k], valueB[k]));
};

// src/conditional.js
var conditional = (condition, onTruth, onFalse) => {
  let result = condition ? onTruth : onFalse;
  if (typeof result === "function") {
    result = result();
  }
  return arrayify(result);
};

// src/marker.js
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
    t: type.toUpperCase()
  };
};

// src/element.js
var childrenToNodes = (element) => {
  const abstractChildNodes = [];
  for (const childNode of element.childNodes) {
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        childNode.textContent ?? ""
      );
    } else {
      const attributes = {};
      for (const attribute of childNode.attributes) {
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

// src/factory.js
var factory = /* @__PURE__ */ new Proxy({}, {
  /**
   * @param {FactoryCache} target Factory cache.
   * @param {string} type Type of the nodes to generate.
   * @returns {Factory} Function that generates the a node with the given type.
   */
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

// src/selector.js
var BRACKET_CLOSE = "]";
var BRACKET_OPEN = "[";
var DOT = ".";
var EQUAL = "=";
var HASH = "#";
var QUOTE_SINGLE = "'";
var QUOTE_DOUBLE = '"';
var TokenTypes = {
  attribute: 0,
  class: 1,
  id: 2,
  type: 3
};
var selectorToTokenizer = (selector) => {
  const length = selector.length;
  let i = 0;
  let type = "";
  const attributes = {};
  let tokenA = "";
  let tokenB = true;
  let tokenType = TokenTypes.type;
  const storeToken = () => {
    if (tokenA) {
      switch (tokenType) {
        case TokenTypes.attribute:
          attributes[tokenA] = tokenB === true ? true : tokenB;
          tokenB = true;
          break;
        case TokenTypes.class:
          if (!attributes.class) {
            attributes.class = tokenA;
            break;
          }
          attributes.class += " " + tokenA;
          break;
        case TokenTypes.id:
          attributes.id = tokenA;
          break;
        case TokenTypes.type:
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
      tokenType = TokenTypes.id;
      continue;
    } else if (character === DOT) {
      storeToken();
      tokenType = TokenTypes.class;
      continue;
    } else if (character === BRACKET_OPEN) {
      storeToken();
      tokenType = TokenTypes.attribute;
      parseAttribute();
      continue;
    }
    tokenA += character;
  }
  return [type, attributes];
};

// src/fctory.js
var fctory = /* @__PURE__ */ new Proxy({}, {
  /**
   * @param {FctoryCache} target Factory cache.
   * @param {string} type Type of the nodes to generate.
   * @returns {Fctory} Function that generates the a node with the given type.
   */
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

// src/identifier.js
var identifierCount = 0;
var identifier = (prefix) => prefix + "-" + identifierCount++;

// src/match.js
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
var memo = (render, memory) => ({
  _: marker,
  r: render,
  m: memory
});

// src/nde.js
var nde = (selector, contents) => {
  const [type, attributes] = selectorToTokenizer(selector);
  return {
    _: marker,
    a: attributes,
    c: arrayifyOrUndefined(contents),
    t: type.toUpperCase()
  };
};
export {
  arrayify,
  arrayifyOrUndefined,
  childrenToNodes,
  cloneRecursive,
  conditional,
  equalRecursive,
  factory,
  fctory,
  identifier,
  marker,
  match,
  memo,
  nde,
  node,
  suffixNameIfMultiple
};
//# sourceMappingURL=staark-common.js.map
