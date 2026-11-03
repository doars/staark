// ../staark-common/src/array.js
var arrayify = (data) => arrayifyOrUndefined(data) || [];
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

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

// ../staark-common/src/element.js
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
        node(childNode.nodeName, attributes, childrenToNodes(childNode))
      );
    }
  }
  return abstractChildNodes;
};

// src/library/patch.js
var updateAttributes = (element, newAttributes, oldAttributes) => {
  if (newAttributes) {
    for (const name of Object.keys(newAttributes)) {
      if (name !== "key") {
        let value = newAttributes[name];
        const oldValue = oldAttributes?.[name];
        if (value !== null && value !== void 0 && value !== false) {
          const type = typeof value;
          if (type === "function") {
            if (oldValue !== value) {
              if (oldValue) {
                element.removeEventListener(name, oldValue);
              }
              element.addEventListener(name, value);
            }
          } else {
            if (name === "class") {
              if (typeof value === "object") {
                if (Array.isArray(value)) {
                  value = value.join(" ");
                } else {
                  let classNames = "";
                  for (const className of Object.keys(value)) {
                    if (value[className]) {
                      classNames += ` ${className}`;
                    }
                  }
                  value = classNames;
                }
              }
              element.className = value;
            } else if (name === "style" && typeof value === "object") {
              for (const styleName of Object.keys(value)) {
                const styleValue = value[styleName];
                if (styleName.includes("-", 1)) {
                  element.style.setProperty(styleName, styleValue);
                } else {
                  element.style[styleName] = styleValue;
                }
              }
              if (oldValue && typeof oldValue === "object" && !Array.isArray(oldValue)) {
                for (const styleName of Object.keys(oldValue)) {
                  if (!Object.hasOwn(value, styleName)) {
                    if (styleName.includes("-", 1)) {
                      element.style.removeProperty(styleName);
                    } else {
                      element.style[styleName] = null;
                    }
                  }
                }
              }
            } else {
              if (type !== "string") {
                value = value.toString();
              }
              element.setAttribute(name, value);
              if (name === "value") {
                element.value = value;
              }
            }
          }
        }
      }
    }
  }
  if (oldAttributes) {
    for (const name of Object.keys(oldAttributes)) {
      if (name !== "key") {
        const value = oldAttributes[name];
        const newValue = newAttributes?.[name];
        if (!Object.hasOwn(newAttributes || {}, name) || newValue === null || newValue === void 0 || newValue === false) {
          if (typeof value === "function") {
            element.removeEventListener(name, value);
          } else if (name === "class") {
            element.className = "";
          } else if (name === "style") {
            element.style.cssText = "";
          } else if (name === "value") {
            element.value = "";
          } else {
            element.removeAttribute(name);
          }
        }
      }
    }
  }
};
var prepare = (rootElement, oldAbstractTree) => {
  const setBefore = "moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
  const getKey = (abstract) => abstract?.a?.key;
  let updateChildren;
  const createNode = (abstract, inSvg) => {
    if (!abstract.t) {
      return document.createTextNode(abstract);
    }
    inSvg = inSvg || abstract.t === "SVG" || abstract.t === "svg";
    const element = inSvg ? document.createElementNS("http://www.w3.org/2000/svg", abstract.t) : document.createElement(abstract.t);
    updateAttributes(element, abstract.a);
    updateChildren(element, abstract.c, void 0, inSvg);
    return element;
  };
  const updateNode = (node2, newAbstract, oldAbstract, inSvg) => {
    if (newAbstract.t) {
      updateAttributes(node2, newAbstract.a, oldAbstract.a);
      updateChildren(
        node2,
        newAbstract.c,
        oldAbstract.c,
        inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg"
      );
    } else if (oldAbstract !== newAbstract) {
      node2.textContent = newAbstract;
    }
  };
  updateChildren = (element, newChildAbstracts, oldChildAbstracts, inSvg) => {
    let hasKeys = false;
    if (newChildAbstracts) {
      for (let index = 0; index < newChildAbstracts.length; index++) {
        const key = getKey(newChildAbstracts[index]);
        if (key != null) {
          hasKeys = true;
          break;
        }
      }
    }
    if (!hasKeys && oldChildAbstracts) {
      for (let index = 0; index < oldChildAbstracts.length; index++) {
        const key = getKey(oldChildAbstracts[index]);
        if (key != null) {
          hasKeys = true;
          break;
        }
      }
    }
    if (hasKeys) {
      const oldNodes = [];
      const keyedEntries = /* @__PURE__ */ new Map();
      const unkeyedEntries = /* @__PURE__ */ new Map();
      if (oldChildAbstracts) {
        for (let index = 0; index < oldChildAbstracts.length; index++) {
          const abstract = oldChildAbstracts[index];
          oldNodes.push(element.childNodes[index]);
          const key = getKey(abstract);
          if (key != null) {
            keyedEntries.set(key, index);
          } else {
            const type = abstract.t || null;
            let entries = unkeyedEntries.get(type);
            if (!entries) {
              entries = {
                indexes: [],
                index: 0
              };
              unkeyedEntries.set(type, entries);
            }
            entries.indexes.push(index);
          }
        }
      }
      if (newChildAbstracts) {
        for (let newIndex = 0; newIndex < newChildAbstracts.length; newIndex++) {
          const newAbstract = newChildAbstracts[newIndex];
          const key = getKey(newAbstract);
          let oldIndex;
          if (key != null) {
            oldIndex = keyedEntries.get(key);
          } else {
            const type = newAbstract.t || null;
            const entries = unkeyedEntries.get(type);
            if (entries) {
              oldIndex = entries.indexes[entries.index++];
            }
          }
          const oldAbstract = oldChildAbstracts?.[oldIndex];
          const oldNode = oldNodes[oldIndex];
          if (oldIndex !== void 0 && oldNode && (oldAbstract.t && newAbstract.t === oldAbstract.t || !oldAbstract.t && !newAbstract.t)) {
            oldNodes[oldIndex] = void 0;
            if (oldNode !== element.childNodes[newIndex]) {
              element[setBefore](oldNode, element.childNodes[newIndex]);
            }
            updateNode(oldNode, newAbstract, oldAbstract, inSvg);
            continue;
          }
          const newNode = createNode(newAbstract, inSvg);
          element.insertBefore(newNode, element.childNodes[newIndex]);
        }
      }
      for (let index = 0; index < oldNodes.length; index++) {
        const oldNode = oldNodes[index];
        if (oldNode?.parentNode === element) {
          oldNode.remove();
        }
      }
    } else {
      let newIndex = 0;
      let newCount = 0;
      if (newChildAbstracts) {
        for (; newIndex < newChildAbstracts.length; newIndex++) {
          const newAbstract = newChildAbstracts[newIndex];
          let matched = false;
          if (oldChildAbstracts) {
            for (let oldIndex = newIndex - newCount; oldIndex < oldChildAbstracts.length; oldIndex++) {
              const oldAbstract = oldChildAbstracts[oldIndex];
              if (oldAbstract.t && newAbstract.t === oldAbstract.t || !oldAbstract.t && !newAbstract.t) {
                matched = true;
                if (newIndex !== oldIndex + newCount) {
                  element[setBefore](
                    element.childNodes[oldIndex + newCount],
                    element.childNodes[newIndex]
                  );
                  oldChildAbstracts.splice(
                    newIndex - newCount,
                    0,
                    oldChildAbstracts.splice(oldIndex, 1)[0]
                  );
                }
                updateNode(
                  element.childNodes[newIndex],
                  newAbstract,
                  oldAbstract,
                  inSvg
                );
                break;
              }
            }
          }
          if (!matched) {
            const newNode = createNode(newAbstract, inSvg);
            element.insertBefore(newNode, element.childNodes[newIndex]);
            newCount++;
          }
        }
      }
      if (oldChildAbstracts) {
        for (let i = oldChildAbstracts.length + newCount - 1; i >= newIndex; i--) {
          element.childNodes[i].remove();
        }
      }
    }
  };
  rootElement = typeof rootElement === "string" ? document.querySelector(rootElement) || document.body.appendChild(document.createElement("div")) : rootElement;
  if (typeof oldAbstractTree === "string") {
    try {
      oldAbstractTree = JSON.parse(oldAbstractTree);
    } catch (_error) {
      oldAbstractTree = null;
    }
  }
  if (!oldAbstractTree) {
    oldAbstractTree = childrenToNodes(rootElement);
  }
  return (newAbstractTree) => {
    newAbstractTree = arrayifyOrUndefined(newAbstractTree);
    updateChildren(rootElement, newAbstractTree, oldAbstractTree);
    oldAbstractTree = newAbstractTree;
  };
};
export {
  conditional,
  factory,
  fctory,
  identifier,
  match,
  nde,
  node,
  prepare
};
//# sourceMappingURL=staark-patch.js.map
