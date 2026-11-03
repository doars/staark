(() => {
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

  // ../staark-common/src/attribute.js
  var attributeToString = (name, value) => typeof value === "string" ? value : name === "class" && typeof value === "object" ? Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ") : `${value}`;

  // ../staark-common/src/compare.js
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

  // src/library/proxy.js
  var created = /* @__PURE__ */ new WeakSet();
  var isProxy = (value) => {
    if (created.has(value)) {
      return true;
    }
    try {
      structuredClone(value);
      return false;
    } catch {
    }
    try {
      structuredClone({ ...value });
      return true;
    } catch {
      return false;
    }
  };
  var proxify = (root, onChange) => {
    const proxies = /* @__PURE__ */ new WeakMap();
    const handler = {
      /**
       * Deletes a property from the target object and invokes the onChange callback if the property existed.
       *
       * @param {Record<string, any>} target - The target object from which the property will be deleted.
       * @param {string} key - The key of the property to be deleted.
       * @returns {boolean} - True if the property was deleted, otherwise false.
       */
      deleteProperty: (target, key) => {
        if (Object.hasOwn(target, key)) {
          const deleted = Reflect.deleteProperty(target, key);
          if (deleted) {
            onChange();
          }
          return deleted;
        }
        return true;
      },
      /**
       * Sets a property on the target object and invokes the onChange callback if the value has changed.
       *
       * @param {Record<string, any>} target - The target object on which the property will be set.
       * @param {string} key - The key of the property to be set.
       * @param {any} value - The value to be set.
       * @returns {boolean} - True if the property was set, otherwise false.
       */
      set: (target, key, value, receiver) => {
        const existingValue = target[key];
        if (existingValue !== value) {
          if (value && typeof value === "object") {
            value = add(value);
          }
          const set = Reflect.set(target, key, value, receiver);
          if (set) {
            onChange();
          }
          return set;
        }
        return true;
      }
    };
    const add = (target) => {
      let proxy2 = proxies.get(target);
      if (proxy2) {
        return proxy2;
      }
      const prototype = Object.getPrototypeOf(target);
      if (!Array.isArray(target) && prototype !== Object.prototype && prototype !== null) {
        return target;
      }
      proxy2 = new Proxy(target, handler);
      proxies.set(target, proxy2);
      for (const key of Object.keys(target)) {
        if (target[key] && typeof target[key] === "object") {
          target[key] = add(target[key]);
        }
      }
      return proxy2;
    };
    const proxy = add(root);
    if (proxy !== root) {
      created.add(proxy);
    }
    return proxy;
  };

  // src/library/mount.js
  var mount = (rootElement, renderView, initialState, oldAbstractTree) => {
    const setBefore = "moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
    const getKey = (abstract) => abstract?.a?.key;
    let updatePromise = null;
    const triggerUpdate = () => {
      if (!updatePromise) {
        updatePromise = Promise.resolve().then(updateAbstracts);
      }
      return updatePromise;
    };
    const state = typeof initialState === "string" ? proxify(JSON.parse(initialState), triggerUpdate) : isProxy(initialState) ? initialState : proxify(initialState || {}, triggerUpdate);
    const listeners = /* @__PURE__ */ new WeakMap();
    const handleEvent = (event) => {
      listeners.get(event.currentTarget)[event.type](event, state);
    };
    const updateAttributes = (element, newAttributes, oldAttributes) => {
      if (newAttributes) {
        for (const name in newAttributes) {
          if (name === "key" || !Object.hasOwn(newAttributes, name)) {
            continue;
          }
          let value = newAttributes[name];
          const oldValue = oldAttributes?.[name];
          if (value !== null && value !== void 0 && value !== false) {
            const type = typeof value;
            if (type === "function") {
              if (value === oldValue) {
                continue;
              }
              let elementListeners = listeners.get(element);
              if (!elementListeners) {
                elementListeners = {};
                listeners.set(element, elementListeners);
              }
              if (!elementListeners[name]) {
                element.addEventListener(name, handleEvent);
              }
              elementListeners[name] = value;
            } else if (name === "style" && type === "object") {
              const oldStyle = oldValue && typeof oldValue === "object" ? oldValue : null;
              if (!oldStyle) {
                element.style.cssText = "";
              }
              for (const styleName in value) {
                const styleValue = value[styleName];
                if (Object.hasOwn(value, styleName) && oldStyle?.[styleName] !== styleValue) {
                  if (styleName.includes("-", 1)) {
                    element.style.setProperty(styleName, styleValue);
                  } else {
                    element.style[styleName] = styleValue;
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
      if (oldAttributes) {
        for (const name in oldAttributes) {
          if (name === "key" || !Object.hasOwn(oldAttributes, name)) {
            continue;
          }
          const newValue = newAttributes?.[name];
          if (newValue === null || newValue === void 0 || newValue === false) {
            if (typeof oldAttributes[name] === "function") {
              element.removeEventListener(name, handleEvent);
              delete listeners.get(element)[name];
            } else {
              element.removeAttribute(name);
              if (name === "value") {
                element.value = "";
              }
            }
          }
        }
      }
    };
    let oldMemoMap = /* @__PURE__ */ new WeakMap();
    let newMemoMap = /* @__PURE__ */ new WeakMap();
    let updateChildren;
    const expand = (abstracts) => {
      let result = abstracts;
      if (abstracts) {
        for (let index = 0; index < abstracts.length; index++) {
          const abstract = abstracts[index];
          if (abstract.r) {
            if (result === abstracts) {
              result = abstracts.slice(0, index);
            }
            let match2 = oldMemoMap.get(abstract.r);
            if (!match2 || !equalPlain(match2.m, abstract.m)) {
              match2 = {
                c: expand(arrayify(abstract.r(state, abstract.m))),
                m: abstract.m
              };
            }
            newMemoMap.set(abstract.r, match2);
            result.push(...match2.c);
          } else if (result !== abstracts) {
            result.push(abstract);
          }
        }
      }
      return result;
    };
    const createNode = (abstract, inSvg) => {
      if (!abstract.t) {
        return document.createTextNode(abstract);
      }
      inSvg = inSvg || abstract.t === "SVG" || abstract.t === "svg";
      const element = inSvg ? document.createElementNS("http://www.w3.org/2000/svg", abstract.t) : document.createElement(abstract.t);
      updateAttributes(element, abstract.a);
      abstract.c = expand(abstract.c);
      updateChildren(element, abstract.c, void 0, inSvg);
      return element;
    };
    const updateNode = (node2, newAbstract, oldAbstract, inSvg) => {
      if (newAbstract === oldAbstract) {
        return;
      }
      if (newAbstract.t) {
        updateAttributes(node2, newAbstract.a, oldAbstract.a);
        newAbstract.c = expand(newAbstract.c);
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
      if (start === oldLength) {
        for (; start < newLength; start++) {
          element.insertBefore(createNode(newChildAbstracts[start], inSvg), node2);
        }
        return;
      }
      const oldNodes = [];
      for (let index = start; index < oldLength; index++) {
        oldNodes[index] = node2;
        node2 = node2?.nextSibling;
      }
      const keyedIndexes = /* @__PURE__ */ new Map();
      const unkeyedIndexes = /* @__PURE__ */ new Map();
      for (let index = oldLength; index-- > start; ) {
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
      for (let index = start; index < newLength; index++) {
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
      for (let index = start; index < oldLength; index++) {
        oldNodes[index]?.remove();
      }
      const stable = increasingSubsequence(sources);
      let next = null;
      for (let index = newLength; index-- > start; ) {
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
      } catch {
        oldAbstractTree = null;
      }
    }
    if (!oldAbstractTree) {
      oldAbstractTree = childrenToNodes(rootElement);
    }
    let active = true, updating = false;
    const updateAbstracts = () => {
      if (active && !updating && updatePromise) {
        updating = true;
        updatePromise = null;
        try {
          const newAbstractTree = expand(arrayifyOrUndefined(renderView(state)));
          updateChildren(rootElement, newAbstractTree, oldAbstractTree);
          oldAbstractTree = newAbstractTree;
          oldMemoMap = newMemoMap;
          newMemoMap = /* @__PURE__ */ new WeakMap();
        } finally {
          updating = false;
        }
      }
    };
    triggerUpdate();
    updateAbstracts();
    return [
      triggerUpdate,
      () => {
        if (active) {
          active = false;
          updatePromise = null;
          for (let i = rootElement.childNodes.length - 1; i >= 0; i--) {
            rootElement.childNodes[i].remove();
          }
        }
      },
      state
    ];
  };

  // src/index.iife.js
  iife(["staark"], {
    conditional,
    factory,
    fctory,
    identifier,
    match,
    memo,
    mount,
    nde,
    node
  });
})();
//# sourceMappingURL=staark.iife.js.map
