// ../staark-common/src/array.js
var arrayify = (data) => arrayifyOrUndefined(data) || [];
var arrayifyOrUndefined = (data) => data === null || data === void 0 || data === false ? void 0 : Array.isArray(data) ? data : [data];

// ../staark-common/src/conditional.js
var conditional = (condition, onTruth, onFalse) => {
  let result = condition ? onTruth : onFalse;
  if (typeof result === "function") {
    result = result();
  }
  return arrayify(result);
};

// ../staark-common/src/marker.js
var marker = "n";

// ../staark-common/src/node.js
var node = (type, attributesOrContents, contents) => {
  if (attributesOrContents !== null && attributesOrContents !== void 0 && attributesOrContents !== false && (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents))) {
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

// ../staark-common/src/selector.js
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

// ../staark-common/src/factory.js
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

// ../staark-common/src/fctory.js
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

// ../staark-common/src/identifier.js
var identifierCount = 0;
var identifier = (prefix) => `${prefix}-${identifierCount++}`;

// ../staark-common/src/match.js
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

// ../staark-common/src/memo.js
var memo = (render, memory) => ({
  _: marker,
  r: render,
  m: memory
});

// ../staark-common/src/nde.js
var nde = (selector, contents) => {
  const [type, attributes] = selectorToTokenizer(selector);
  return {
    _: marker,
    a: attributes,
    c: arrayifyOrUndefined(contents),
    t: type
  };
};

// ../staark-common/src/attribute.js
var attributeToString = (name, value) => typeof value === "string" ? value : name === "class" && typeof value === "object" ? Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ") : name === "style" && Array.isArray(value) ? value.join(";") : `${value}`;
var styleValueToString = (value) => value === null || value === void 0 || value === false ? "" : Array.isArray(value) ? value.join(" ") : `${value}`;
var styleToString = (style) => {
  const declarations = [];
  for (const name of Object.keys(style)) {
    const value = styleValueToString(style[name]);
    if (value) {
      declarations.push(
        `${name.includes("-") ? name : name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)}:${value}`
      );
    }
  }
  return declarations.join(";");
};

// src/library/stringify.js
var SELF_CLOSING = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var UNSAFE_NAME_CHARACTERS = /[\s"'<>/=]/;
var TEXT_CHARACTERS = /[&<>]/g;
var ATTRIBUTE_CHARACTERS = /[&<>"']/g;
var ESCAPED_CHARACTERS = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var escapeCharacter = (character) => ESCAPED_CHARACTERS[character];
var escapeText = (value) => String(value).replace(TEXT_CHARACTERS, escapeCharacter);
var escapeAttribute = (value) => String(value).replace(ATTRIBUTE_CHARACTERS, escapeCharacter);
var validateName = (name, context) => {
  if (typeof name !== "string" || name.length === 0 || UNSAFE_NAME_CHARACTERS.test(name)) {
    throw new TypeError(`Invalid ${context} name: ${String(name)}`);
  }
  return name;
};
var renderAttributes = (attributes) => {
  let rendered = "";
  if (!attributes) {
    return rendered;
  }
  for (const name of Object.keys(attributes)) {
    const validatedName = validateName(name, "attribute");
    let value = attributes[name];
    if (value === null || value === void 0 || value === false || validatedName === "key" || typeof value === "function") {
      continue;
    }
    value = validatedName === "style" && typeof value === "object" && !Array.isArray(value) ? styleToString(value) : attributeToString(validatedName, value);
    rendered += ` ${validatedName}="${escapeAttribute(value)}"`;
  }
  return rendered;
};
var expand = (abstracts, state) => {
  if (!abstracts) {
    return abstracts;
  }
  const expanded = [];
  const add = (abstract) => {
    if (abstract === null || abstract === void 0 || abstract === false) {
      return;
    }
    if (abstract.r) {
      for (const child of arrayify(abstract.r(state, abstract.m))) {
        add(child);
      }
    } else if (abstract.t) {
      expanded.push({
        ...abstract,
        c: expand(abstract.c, state)
      });
    } else if (abstract !== "") {
      const last = expanded.length - 1;
      if (last >= 0 && !expanded[last].t) {
        expanded[last] += `${abstract}`;
      } else {
        expanded.push(`${abstract}`);
      }
    }
  };
  for (const abstract of abstracts) {
    add(abstract);
  }
  return expanded;
};
var renderElements = (abstracts) => {
  let rendered = "";
  if (!abstracts) {
    return rendered;
  }
  for (const abstract of abstracts) {
    if (abstract.t) {
      const type = validateName(abstract.t, "element").toLowerCase();
      rendered += `<${type}${renderAttributes(abstract.a)}`;
      if (SELF_CLOSING.has(type)) {
        rendered += "/>";
      } else {
        rendered += `>${renderElements(abstract.c)}</${type}>`;
      }
    } else {
      rendered += escapeText(abstract);
    }
  }
  return rendered;
};
var stringifyPatch = (abstractTree) => {
  abstractTree = expand(arrayifyOrUndefined(abstractTree));
  return [renderElements(abstractTree), abstractTree];
};
var stringify = (renderView, initialState) => {
  if (!initialState) {
    initialState = {};
  }
  const abstractTree = expand(
    arrayifyOrUndefined(renderView(initialState)),
    initialState
  );
  return [renderElements(abstractTree), abstractTree];
};
var customStringify = (data) => {
  if (data === null) {
    return "null";
  }
  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }
  if (typeof data === "string") {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    const values = [];
    for (const value of data) {
      values.push(customStringify(value));
    }
    return `[${values.join(",")}]`;
  }
  if (typeof data === "object") {
    const values = [];
    for (const key of Object.keys(data)) {
      if (!key.startsWith("_") && data[key] !== void 0 && typeof data[key] !== "function") {
        values.push(`${JSON.stringify(key)}:${customStringify(data[key])}`);
      }
    }
    return `{${values.join(",")}}`;
  }
  return "null";
};
var stringifyPatchFull = (abstracts) => {
  const [rendered, abstractTree] = stringifyPatch(abstracts);
  return [rendered, customStringify(abstractTree)];
};
var stringifyFull = (renderView, initialState) => {
  if (!initialState) {
    initialState = {};
  }
  const [rendered, abstractTree] = stringify(renderView, initialState);
  return [
    rendered,
    customStringify(abstractTree),
    JSON.stringify(initialState)
  ];
};
export {
  conditional,
  factory,
  fctory,
  identifier,
  match,
  memo,
  nde,
  node,
  stringify,
  stringifyFull,
  stringifyPatch,
  stringifyPatchFull
};
//# sourceMappingURL=staark-isomorphic.js.map
