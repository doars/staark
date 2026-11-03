(() => {
  // ../staark-common/src/marker.js
  var marker = "n";

  // ../staark-common/src/memo.js
  var memo = (render, memory) => ({
    _: marker,
    r: render,
    m: memory
  });

  // ../staark-common/src/array.js
  var arrayify = (data) => arrayifyOrUndefined(data) || [];
  var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

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

  // ../staark-common/src/compare.js
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

  // src/library/proxy.js
  var created = /* @__PURE__ */ new WeakSet();
  var isProxy = (value) => created.has(value);
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
      let proxy = proxies.get(target);
      if (proxy) {
        return proxy;
      }
      const prototype = Object.getPrototypeOf(target);
      if (!Array.isArray(target) && prototype !== Object.prototype && prototype !== null) {
        return target;
      }
      proxy = new Proxy(target, handler);
      proxies.set(target, proxy);
      created.add(proxy);
      for (const key of Object.keys(target)) {
        if (target[key] && typeof target[key] === "object") {
          target[key] = add(target[key]);
        }
      }
      return proxy;
    };
    return add(root);
  };

  // src/library/mount.js
  var findStable = (sources) => {
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
    const stable = [];
    for (let index = tails[tails.length - 1]; index >= 0; index = previous[index]) {
      stable[index] = true;
    }
    return stable;
  };
  var mount = (rootElement, renderView, initialState, oldAbstractTree) => {
    const setBefore = "moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
    const getKey = (abstract) => abstract?.a?.key;
    if (typeof initialState === "string") {
      initialState = JSON.parse(initialState);
    }
    if (!initialState) {
      initialState = {};
    }
    let updatePromise = null;
    const triggerUpdate = () => {
      if (!updatePromise) {
        updatePromise = Promise.resolve().then(updateAbstracts);
      }
      return updatePromise;
    };
    const state = isProxy(initialState) ? initialState : proxify(initialState, triggerUpdate);
    const listeners = /* @__PURE__ */ new WeakMap();
    const handleEvent = (event) => {
      listeners.get(event.currentTarget)[event.type](event, state);
    };
    const updateAttributes = (element, newAttributes, oldAttributes) => {
      if (newAttributes) {
        for (const name of Object.keys(newAttributes)) {
          if (name === "key") {
            continue;
          }
          let value = newAttributes[name];
          const oldValue = oldAttributes?.[name];
          if (value !== null && value !== void 0 && value !== false) {
            const type = typeof value;
            if (type === "function") {
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
              for (const styleName of Object.keys(value)) {
                const styleValue = value[styleName];
                if (oldStyle?.[styleName] !== styleValue) {
                  if (styleName.includes("-", 1)) {
                    element.style.setProperty(styleName, styleValue);
                  } else {
                    element.style[styleName] = styleValue;
                  }
                }
              }
              if (oldStyle) {
                for (const styleName of Object.keys(oldStyle)) {
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
              if (name === "class" && type === "object") {
                value = Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ");
              } else if (type !== "string") {
                value = value.toString();
              }
              if (element.getAttribute(name) !== value) {
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
        for (const name of Object.keys(oldAttributes)) {
          if (name === "key") {
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
            let match = oldMemoMap.get(abstract.r);
            if (!match || !equalRecursive(match.m, abstract.m)) {
              match = {
                c: expand(arrayify(abstract.r(state, abstract.m))),
                m: abstract.m
              };
            }
            newMemoMap.set(abstract.r, match);
            result.push(...match.c);
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
      if (start === newLength && start === oldLength) {
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
      const stable = findStable(sources);
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

  // src/index.base.iife.js
  iife(["staark"], {
    memo,
    mount,
    node
  });
})();
//# sourceMappingURL=staark.base.iife.js.map
