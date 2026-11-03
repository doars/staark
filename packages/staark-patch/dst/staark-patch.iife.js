(() => {
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

  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    const last = path.pop();
    for (const key of path) {
      subject = subject[key] && typeof subject[key] === "object" ? subject[key] : subject[key] = {};
    }
    subject[last] = data;
  };

  // ../staark-common/src/attribute.js
  var attributeToString = (name, value) => typeof value === "string" ? value : name === "class" && typeof value === "object" ? Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ") : name === "style" && Array.isArray(value) ? value.join(";") : `${value}`;
  var styleValueToString = (value) => value === null || value === void 0 || value === false ? "" : Array.isArray(value) ? value.join(" ") : `${value}`;

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

  // ../staark-common/src/sequence.js
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

  // src/library/patch.js
  var updateAttributes = (element, newAttributes, oldAttributes) => {
    if (newAttributes) {
      for (const name in newAttributes) {
        if (name !== "key" && Object.hasOwn(newAttributes, name)) {
          let value = newAttributes[name];
          const oldValue = oldAttributes?.[name];
          if (value !== null && value !== void 0 && value !== false) {
            const type = typeof value;
            if (type === "function") {
              if (oldValue !== value) {
                if (typeof oldValue === "function") {
                  element.removeEventListener(name, oldValue);
                }
                element.addEventListener(name, value);
              }
            } else if (name === "style" && type === "object" && !Array.isArray(value)) {
              const oldStyle = oldValue && typeof oldValue === "object" && !Array.isArray(oldValue) ? oldValue : null;
              if (!oldStyle) {
                element.style.cssText = "";
              }
              for (const styleName in value) {
                const styleValue = value[styleName];
                if (Object.hasOwn(value, styleName) && oldStyle?.[styleName] !== styleValue) {
                  if (styleName.includes("-", 1)) {
                    element.style.setProperty(
                      styleName,
                      styleValueToString(styleValue)
                    );
                  } else {
                    element.style[styleName] = styleValueToString(styleValue);
                  }
                }
              }
              if (oldStyle) {
                for (const styleName in oldStyle) {
                  if (Object.hasOwn(oldStyle, styleName) && !Object.hasOwn(value, styleName)) {
                    if (styleName.includes("-", 1)) {
                      element.style.removeProperty(styleName);
                    } else {
                      element.style[styleName] = "";
                    }
                  }
                }
              }
            } else if (value !== oldValue || name === "value") {
              value = attributeToString(name, value);
              if (oldValue === null || oldValue === void 0 || oldValue === false || attributeToString(name, oldValue) !== value) {
                element.setAttribute(name, value);
              }
              if (name === "value" && element.value !== value) {
                element.value = value;
              }
            }
          }
        }
      }
    }
    if (oldAttributes) {
      for (const name in oldAttributes) {
        if (name !== "key" && Object.hasOwn(oldAttributes, name)) {
          const value = oldAttributes[name];
          const newValue = newAttributes?.[name];
          if (newValue === null || newValue === void 0 || newValue === false) {
            if (typeof value === "function") {
              element.removeEventListener(name, value);
            } else {
              element.removeAttribute(name);
              if (name === "value") {
                element.value = "";
              }
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
      if (newAbstract === oldAbstract) {
        return;
      }
      if (newAbstract.t) {
        updateAttributes(node2, newAbstract.a, oldAbstract.a);
        updateChildren(
          node2,
          newAbstract.c,
          oldAbstract.c,
          inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg"
        );
      } else {
        node2.textContent = newAbstract;
      }
    };
    updateChildren = (element, newChildAbstracts = [], oldChildAbstracts = [], inSvg) => {
      const newLength = newChildAbstracts.length;
      const oldLength = oldChildAbstracts.length;
      let start = 0;
      let node2 = element.firstChild;
      for (; start < newLength && start < oldLength; start++) {
        const newAbstract = newChildAbstracts[start];
        const oldAbstract = oldChildAbstracts[start];
        if (newAbstract.t !== oldAbstract.t || getKey(newAbstract) !== getKey(oldAbstract)) {
          break;
        }
        updateNode(node2, newAbstract, oldAbstract, inSvg);
        node2 = node2.nextSibling;
      }
      let newEnd = newLength;
      let oldEnd = oldLength;
      let end = null;
      if (start < oldLength && start < newLength) {
        let tail = element.lastChild;
        while (start < newEnd && start < oldEnd) {
          const newAbstract = newChildAbstracts[newEnd - 1];
          const oldAbstract = oldChildAbstracts[oldEnd - 1];
          const key = getKey(oldAbstract);
          if (key == null || newAbstract.t !== oldAbstract.t || getKey(newAbstract) !== key) {
            break;
          }
          updateNode(tail, newAbstract, oldAbstract, inSvg);
          end = tail;
          tail = tail.previousSibling;
          newEnd--;
          oldEnd--;
        }
      }
      if (start === oldEnd) {
        for (; start < newEnd; start++) {
          element.insertBefore(createNode(newChildAbstracts[start], inSvg), end);
        }
        return;
      }
      if (start === newEnd) {
        for (; start < oldEnd; start++) {
          const next2 = node2.nextSibling;
          node2.remove();
          node2 = next2;
        }
        return;
      }
      const oldNodes = [];
      for (let index = start; index < oldEnd; index++) {
        oldNodes[index] = node2;
        node2 = node2?.nextSibling;
      }
      const keyedIndexes = /* @__PURE__ */ new Map();
      const unkeyedIndexes = /* @__PURE__ */ new Map();
      for (let index = oldEnd; index-- > start; ) {
        const abstract = oldChildAbstracts[index];
        const key = getKey(abstract);
        if (key != null) {
          keyedIndexes.set(key, index);
        } else {
          let indexes = unkeyedIndexes.get(abstract.t);
          if (!indexes) {
            indexes = [];
            unkeyedIndexes.set(abstract.t, indexes);
          }
          indexes.push(index);
        }
      }
      const newNodes = [];
      const sources = [];
      for (let index = start; index < newEnd; index++) {
        const newAbstract = newChildAbstracts[index];
        const key = getKey(newAbstract);
        const oldIndex = key != null ? keyedIndexes.get(key) : unkeyedIndexes.get(newAbstract.t)?.pop();
        const oldNode = oldNodes[oldIndex];
        if (oldNode && oldChildAbstracts[oldIndex].t === newAbstract.t) {
          oldNodes[oldIndex] = null;
          newNodes[index] = oldNode;
          sources[index] = oldIndex;
          updateNode(oldNode, newAbstract, oldChildAbstracts[oldIndex], inSvg);
        }
      }
      for (let index = start; index < oldEnd; index++) {
        oldNodes[index]?.remove();
      }
      const stable = increasingSubsequence(sources);
      let next = end;
      for (let index = newEnd; index-- > start; ) {
        let child = newNodes[index];
        if (!child) {
          child = createNode(newChildAbstracts[index], inSvg);
          element.insertBefore(child, next);
        } else if (!stable[index]) {
          element[setBefore](child, next);
        }
        next = child;
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

  // src/index.iife.js
  iife(["staark"], {
    conditional,
    factory,
    fctory,
    identifier,
    match,
    nde,
    node,
    prepare
  });
})();
//# sourceMappingURL=staark-patch.iife.js.map
