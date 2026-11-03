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
  var arrayifyOrUndefined = (data) => data === null || data === void 0 || data === false ? void 0 : Array.isArray(data) ? data : [data];

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
  var attributeToString = (name, value) => typeof value === "string" ? value : name === "class" && typeof value === "object" ? Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ") : name === "style" && Array.isArray(value) ? value.join(";") : `${value}`;
  var styleValueToString = (value) => value === null || value === void 0 || value === false ? "" : Array.isArray(value) ? value.join(" ") : `${value}`;

  // ../staark-common/src/compare.js
  var equalChild = (childA, childB, parent, path) => {
    if (!childA || !childB || typeof childA !== "object" || typeof childB !== "object") {
      return false;
    }
    path ??= [];
    path.push(parent);
    const equal = equalPlain(childA, childB, path);
    path.pop();
    return equal;
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
    if (prototype !== Object.getPrototypeOf(valueB) || prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null || path?.includes(valueA)) {
      return false;
    }
    if (prototype === Array.prototype) {
      if (valueA.length !== valueB.length) {
        return false;
      }
      for (let index = 0; index < valueA.length; index++) {
        const childA = valueA[index];
        const childB = valueB[index];
        if (childA !== childB && !equalChild(childA, childB, valueA, path)) {
          return false;
        }
      }
      return true;
    }
    let count = 0;
    for (const key in valueA) {
      if (Object.hasOwn(valueA, key)) {
        count++;
        const childA = valueA[key];
        const childB = valueB[key];
        if (childB === void 0 && !Object.hasOwn(valueB, key) || childA !== childB && !equalChild(childA, childB, valueA, path)) {
          return false;
        }
      }
    }
    return count === Object.keys(valueB).length;
  };
  var clonePlain = (value, path) => {
    if (!value || typeof value !== "object") {
      return value;
    }
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    const prototype = Object.getPrototypeOf(value);
    path ??= [];
    if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null || path.includes(value)) {
      return value;
    }
    path.push(value);
    const copy = Array.isArray(value) ? [] : prototype ? {} : /* @__PURE__ */ Object.create(null);
    for (const key of Object.keys(value)) {
      copy[key] = clonePlain(value[key], path);
    }
    path.pop();
    return copy;
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
  var targets = /* @__PURE__ */ new WeakMap();
  var isProxy = (value) => {
    if (targets.has(value)) {
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
  var toTarget = (value) => targets.get(value) ?? value;
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
    const methods = /* @__PURE__ */ Object.create(null);
    const wrap = (names, type) => {
      for (const name of names.split(" ")) {
        const method = Array.prototype[name];
        if (method) {
          methods[name] = function(...args) {
            const target = toTarget(this);
            if (proxies.get(target) !== this) {
              return method.apply(this, args);
            }
            const callback = args[0];
            if (type === 3) {
              for (let index = 0; index < args.length; index++) {
                if (args[index] && typeof args[index] === "object") {
                  args[index] = add(args[index]);
                }
              }
              const before = target.slice();
              const result = method.apply(target, args);
              if (before.length !== target.length || before.some((value, index) => value !== target[index])) {
                onChange();
              }
              return result === target ? this : result;
            }
            if (type && typeof callback === "function") {
              const proxy = this;
              args[0] = function(a, b, c) {
                return type === 1 ? callback.call(this, a, b, proxy) : callback(a, b, c, proxy);
              };
            }
            return method.apply(target, args);
          };
        }
      }
    };
    wrap("includes indexOf join slice toReversed toSorted values", 0);
    wrap(
      "every filter find findIndex findLast findLastIndex flatMap forEach map some",
      1
    );
    wrap("reduce reduceRight", 2);
    wrap("copyWithin fill reverse shift sort splice unshift", 3);
    methods[Symbol.iterator] = methods.values;
    const arrayHandler = {
      ...handler,
      get: (target, key, receiver) => methods[key] ?? Reflect.get(target, key, receiver)
    };
    const add = (target) => {
      let proxy = proxies.get(toTarget(target));
      if (proxy) {
        return proxy;
      }
      const prototype = Object.getPrototypeOf(target);
      if (!Array.isArray(target) && prototype !== Object.prototype && prototype !== null) {
        return target;
      }
      proxy = new Proxy(target, Array.isArray(target) ? arrayHandler : handler);
      proxies.set(target, proxy);
      targets.set(proxy, target);
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
            let memos = newMemoMap.get(abstract.r);
            if (!memos) {
              memos = [];
              newMemoMap.set(abstract.r, memos);
            }
            const oldMemos = oldMemoMap.get(abstract.r);
            const memory = abstract.m && typeof abstract.m === "object" ? toTarget(abstract.m) : abstract.m;
            const atPosition = oldMemos?.[memos.length];
            let match = atPosition;
            if (!match || !equalPlain(match.m, memory)) {
              match = void 0;
              if (oldMemos && atPosition?.t !== memory) {
                if (!oldMemos.i) {
                  oldMemos.i = /* @__PURE__ */ new Map();
                  for (const memo2 of oldMemos) {
                    oldMemos.i.set(memo2.t, memo2);
                  }
                }
                match = oldMemos.i.get(memory);
                if (match && !equalPlain(match.m, memory)) {
                  match = void 0;
                }
              }
            }
            if (!match) {
              match = {
                c: expand(arrayify(abstract.r(state, abstract.m))),
                // Copied so memory mutated in place, such as the state, is still compared with its previous contents.
                m: clonePlain(memory),
                t: memory
              };
            } else if (match.t !== memory) {
              match = { c: match.c, m: match.m, t: memory };
            }
            memos.push(match);
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
        if (newAbstract !== oldAbstract) {
          if (newAbstract.t !== oldAbstract.t || getKey(newAbstract) !== getKey(oldAbstract)) {
            break;
          }
          updateNode(node2, newAbstract, oldAbstract, inSvg);
        }
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
