(() => {
  // ../../.scripts/iife.js
  var iife = (path, data) => {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

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

  // ../staark-common/src/clone.js
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

  // ../staark-common/src/compare.js
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

  // ../staark-common/src/element.js
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

  // src/library/proxy.js
  var proxify = (root, onChange) => {
    const handler = {
      /**
       * Deletes a property from the target object and invokes the onChange callback if the property existed.
       *
       * @param {Record<string, any>} target - The target object from which the property will be deleted.
       * @param {string} key - The key of the property to be deleted.
       * @returns {boolean} - True if the property was deleted, otherwise false.
       */
      deleteProperty: (target, key) => {
        if (Reflect.has(target, key)) {
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
      set: (target, key, value) => {
        const existingValue = target[key];
        if (existingValue !== value) {
          if (value && typeof value === "object") {
            value = add(value);
          }
          target[key] = value;
          onChange();
        }
        return true;
      }
    };
    const add = (target) => {
      for (const key in target) {
        if (target[key] && typeof target[key] === "object") {
          target[key] = add(target[key]);
        }
      }
      return new Proxy(target, handler);
    };
    return add(root);
  };

  // src/library/mount.js
  var mount = (rootElement, renderView, initialState, oldAbstractTree) => {
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
    let state = Object.getPrototypeOf(initialState) === Proxy.prototype ? initialState : proxify(
      initialState,
      triggerUpdate
    );
    const updateAttributes = (element, newAttributes, oldAttributes) => {
      if (newAttributes) {
        for (const name in newAttributes) {
          let value = newAttributes[name];
          if (value) {
            const type = typeof value;
            if (type === "function") {
              const oldValue = oldAttributes?.[name];
              if (oldValue?.f === value) {
                newAttributes[name] = oldValue;
              } else {
                if (oldValue) {
                  element.removeEventListener(
                    name,
                    oldValue
                  );
                }
                const listener = newAttributes[name] = (event) => {
                  value(event, state);
                };
                element.addEventListener(
                  name,
                  listener
                );
                listener.f = value;
              }
            } else {
              if (name === "class") {
                if (typeof value === "object") {
                  if (Array.isArray(value)) {
                    value = value.join(" ");
                  } else {
                    let classNames = "";
                    for (const className in value) {
                      if (value[className]) {
                        classNames += " " + className;
                      }
                    }
                    value = classNames;
                  }
                }
                element.className = value;
              } else if (name === "style" && typeof value === "object") {
                for (let styleName in value) {
                  let styleValue = value[styleName];
                  if (styleName.includes("-", 1)) {
                    element.style.setProperty(
                      styleName,
                      styleValue
                    );
                  } else {
                    element.style[styleName] = styleValue;
                  }
                }
                if (oldAttributes && oldAttributes[name] && typeof oldAttributes[name] === "object" && !Array.isArray(oldAttributes[name])) {
                  for (let styleName in oldAttributes[name]) {
                    if (!value[styleName]) {
                      if (styleName.includes("-", 1)) {
                        element.style.removeProperty(
                          styleName
                        );
                      } else {
                        element.style[styleName] = null;
                      }
                    }
                  }
                }
              } else {
                if (value === true) {
                  value = "true";
                } else if (type !== "string") {
                  value = value.toString();
                }
                element.setAttribute(name, value);
              }
            }
          }
        }
      }
      if (oldAttributes) {
        for (const name in oldAttributes) {
          const value = oldAttributes[name];
          if (!newAttributes || !newAttributes[name]) {
            if (typeof value === "function") {
              element.removeEventListener(
                name,
                oldAttributes[name]
              );
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
    const updateChildren = (element, newChildAbstracts, oldChildAbstracts) => {
      let newIndex = 0;
      let newCount = 0;
      if (newChildAbstracts) {
        for (; newIndex < newChildAbstracts.length; newIndex++) {
          const newAbstract = newChildAbstracts[newIndex];
          if (newAbstract.r) {
            let match = oldMemoMap.get(
              newAbstract.r
            );
            if (!match || !equalRecursive(match.m, newAbstract.m)) {
              match = {
                c: arrayifyOrUndefined(
                  newAbstract.r(
                    state,
                    newAbstract.m
                  )
                ),
                m: newAbstract.m,
                r: newAbstract.r
              };
            }
            newMemoMap.set(newAbstract.r, match);
            newChildAbstracts.splice(
              newIndex,
              1,
              ...cloneRecursive(
                match.c
              )
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
                  element.insertBefore(
                    element.childNodes[oldIndex + newCount],
                    element.childNodes[newIndex]
                  );
                  oldChildAbstracts.splice(
                    newIndex - newCount,
                    0,
                    oldChildAbstracts.splice(
                      oldIndex,
                      1
                    )[0]
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
                    oldAbstract.c
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
              newNode = document.createElement(
                newAbstract.t
              );
              updateAttributes(
                newNode,
                newAbstract.a
              );
              updateChildren(
                newNode,
                newAbstract.c
              );
            } else {
              newNode = document.createTextNode(
                newAbstract
              );
            }
            element.insertBefore(
              newNode,
              element.childNodes[newIndex]
            );
            newCount++;
          }
        }
      }
      if (oldChildAbstracts) {
        const elementLength = oldChildAbstracts.length + newCount;
        if (elementLength >= newIndex) {
          for (let i = elementLength - 1; i >= newIndex; i--) {
            element.childNodes[i].remove();
          }
        }
      }
    };
    const _rootElement = typeof rootElement === "string" ? document.querySelector(rootElement) || document.body.appendChild(
      document.createElement("div")
    ) : rootElement;
    if (typeof oldAbstractTree === "string") {
      try {
        oldAbstractTree = JSON.parse(oldAbstractTree);
      } catch (error) {
        oldAbstractTree = null;
      }
    }
    if (!oldAbstractTree) {
      oldAbstractTree = childrenToNodes(_rootElement);
    }
    let active = true, updating = false;
    const updateAbstracts = () => {
      if (active && !updating && updatePromise) {
        updating = true;
        updatePromise = null;
        let newAbstractTree = arrayifyOrUndefined(
          renderView(state)
        );
        updateChildren(
          _rootElement,
          newAbstractTree,
          oldAbstractTree
        );
        oldAbstractTree = newAbstractTree;
        oldMemoMap = newMemoMap;
        newMemoMap = /* @__PURE__ */ new WeakMap();
        updating = false;
      }
    };
    triggerUpdate();
    updateAbstracts();
    return [
      triggerUpdate,
      () => {
        if (active) {
          active = false;
          for (let i = _rootElement.childNodes.length - 1; i >= 0; i--) {
            _rootElement.childNodes[i].remove();
          }
        }
      },
      state
    ];
  };

  // src/index.base.iife.js
  iife([
    "staark"
  ], {
    memo,
    mount,
    node
  });
})();
//# sourceMappingURL=staark.base.iife.js.map
