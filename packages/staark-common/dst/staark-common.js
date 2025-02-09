// src/array.ts
var arrayify = (data) => {
  var _a;
  return (_a = arrayifyOrUndefined(data)) != null ? _a : [];
};
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

// src/attribute.ts
var SUFFIX_MULTIPLE = "[]";
var suffixNameIfMultiple = (attributes) => {
  if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
    attributes.name += SUFFIX_MULTIPLE;
  }
};

// src/clone.ts
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

// src/compare.ts
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

// src/conditional.ts
var conditional = (condition, onTruth, onFalse) => {
  let result = condition ? onTruth : onFalse;
  if (typeof result === "function") {
    result = result();
  }
  return arrayify(result);
};

// src/marker.ts
var marker = "n";

// src/node.ts
var node = (type, attributesOrContents, contents) => {
  if (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents)) {
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

// src/element.ts
var childrenToNodes = (element) => {
  var _a;
  const abstractChildNodes = [];
  for (const childNode of element.childNodes) {
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        (_a = childNode.textContent) != null ? _a : ""
      );
    } else {
      const elementChild = childNode;
      const attributes = {};
      for (const attribute of elementChild.attributes) {
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
var identifierCount = 0;
var identifier = (prefix) => prefix + "-" + identifierCount++;

// src/match.ts
var match = (pattern, lookup) => {
  let result;
  if (lookup && pattern in lookup && lookup[pattern]) {
    result = lookup[pattern];
    if (typeof result === "function") {
      result = result();
    }
  }
  return arrayify(result);
};

// src/memo.ts
var memo = (render, memory) => ({
  _: marker,
  r: render,
  m: memory
});

// src/nde.ts
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
