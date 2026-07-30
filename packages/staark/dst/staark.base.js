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

  // ../staark-common/src/clone.js
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

  // ../staark-common/src/compare.js
  var equalRecursive = (valueA, valueB, compared = /* @__PURE__ */ new WeakMap()) => {
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
        for (const attribute of childNode.attributes) {
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
    const state = Object.getPrototypeOf(initialState) === Proxy.prototype ? initialState : proxify(initialState, triggerUpdate);
    const updateAttributes = (element, newAttributes, oldAttributes) => {
      if (newAttributes) {
        for (const name of Object.keys(newAttributes)) {
          let value = newAttributes[name];
          const oldValue = oldAttributes?.[name];
          if (value !== null && value !== void 0 && value !== false) {
            const type = typeof value;
            if (type === "function") {
              if (oldValue?.f === value) {
                newAttributes[name] = oldValue;
              } else {
                if (oldValue) {
                  element.removeEventListener(name, oldValue);
                }
                const listener = newAttributes[name] = (event) => {
                  value(event, state);
                };
                element.addEventListener(name, listener);
                listener.f = value;
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
      if (oldAttributes) {
        for (const name of Object.keys(oldAttributes)) {
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
    };
    let oldMemoMap = /* @__PURE__ */ new WeakMap();
    let newMemoMap = /* @__PURE__ */ new WeakMap();
    const updateChildren = (element, newChildAbstracts, oldChildAbstracts, inSvg) => {
      let newIndex = 0;
      let newCount = 0;
      if (newChildAbstracts) {
        for (; newIndex < newChildAbstracts.length; newIndex++) {
          const newAbstract = newChildAbstracts[newIndex];
          if (newAbstract.r) {
            let match = oldMemoMap.get(newAbstract.r);
            if (!match || !equalRecursive(match.m, newAbstract.m)) {
              match = {
                c: arrayifyOrUndefined(newAbstract.r(state, newAbstract.m)),
                m: newAbstract.m
              };
            }
            newMemoMap.set(newAbstract.r, match);
            newChildAbstracts.splice(
              newIndex,
              1,
              ...cloneRecursive(match.c)
            );
            newIndex--;
            continue;
          }
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
                if (newAbstract.t) {
                  updateAttributes(
                    element.childNodes[newIndex],
                    newAbstract.a,
                    oldAbstract.a
                  );
                  updateChildren(
                    element.childNodes[newIndex],
                    newAbstract.c,
                    oldAbstract.c,
                    inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg"
                  );
                } else if (oldAbstract !== newAbstract) {
                  element.childNodes[newIndex].textContent = newAbstract;
                }
                break;
              }
            }
          }
          if (!matched) {
            let newNode;
            if (newAbstract.t) {
              const _inSvg = inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg";
              if (_inSvg) {
                newNode = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  newAbstract.t
                );
              } else {
                newNode = document.createElement(newAbstract.t);
              }
              updateAttributes(newNode, newAbstract.a);
              updateChildren(newNode, newAbstract.c, void 0, _inSvg);
            } else {
              newNode = document.createTextNode(newAbstract);
            }
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
          const newAbstractTree = arrayifyOrUndefined(renderView(state));
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
})();
//# sourceMappingURL=staark.base.js.map
