// ../staark-common/src/marker.ts
var marker = "n";

// ../staark-common/src/memo.ts
var memo = (render, memory) => ({
  _: marker,
  r: render,
  m: memory
});

// ../staark-common/src/array.ts
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

// ../staark-common/src/node.ts
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

// ../staark-common/src/clone.ts
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

// ../staark-common/src/compare.ts
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

// ../staark-common/src/element.ts
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

// src/utilities/proxy.ts
var proxify = (root, onChange) => {
  const map = /* @__PURE__ */ new WeakMap();
  const handler = {
    deleteProperty: (target, key) => {
      if (Reflect.has(target, key)) {
        const value = target[key];
        if (typeof value === "object" && value && map.has(value)) {
          map.get(value).revoke();
        }
        const deleted = Reflect.deleteProperty(target, key);
        if (deleted) {
          onChange();
        }
        return deleted;
      }
      return true;
    },
    set: (target, key, value) => {
      const existingValue = target[key];
      if (existingValue !== value) {
        if (typeof existingValue === "object" && existingValue && map.has(existingValue)) {
          map.get(existingValue).revoke();
        }
        target[key] = typeof value === "object" && value ? map.has(value) ? map.get(value).proxy : createProxy(value) : value;
        onChange();
      }
      return true;
    }
  };
  const createProxy = (target) => {
    if (map.has(target)) {
      return map.get(target).proxy;
    }
    for (const key in target) {
      const value = target[key];
      if (value && typeof value === "object") {
        target[key] = createProxy(value);
      }
    }
    const revocable = Proxy.revocable(target, handler);
    map.set(target, revocable);
    return revocable.proxy;
  };
  return createProxy(root);
};

// src/library/mount.ts
var MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
var HYPHENATE = (part, offset) => (offset ? "-" : "") + part;
var mount = (rootElement, renderView, initialState, oldAbstractTree) => {
  if (typeof initialState === "string") {
    initialState = JSON.parse(initialState);
  }
  initialState != null ? initialState : initialState = {};
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
            const oldValue = oldAttributes == null ? void 0 : oldAttributes[name];
            if ((oldValue == null ? void 0 : oldValue.f) !== value) {
              if (oldValue) {
                element.removeEventListener(
                  name,
                  oldValue
                );
              }
              const listener = newAttributes[name] = (event) => {
                value(event, state);
              };
              listener.f = value;
              element.addEventListener(
                name,
                listener
              );
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
                styleName = styleName.replace(MATCH_CAPITALS, HYPHENATE).toLowerCase();
                if (Array.isArray(styleValue)) {
                  styleValue = styleValue.join(" ");
                }
                element.style.setProperty(
                  styleName,
                  styleValue
                );
              }
              if (oldAttributes && oldAttributes[name] && typeof oldAttributes[name] === "object" && !Array.isArray(oldAttributes[name])) {
                for (let styleName in oldAttributes[name]) {
                  if (!(styleName in value)) {
                    styleName = styleName.replace(MATCH_CAPITALS, HYPHENATE).toLowerCase();
                    element.style.removeProperty(
                      styleName
                    );
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
          } else {
            element.removeAttribute(name);
          }
        }
      }
    }
  };
  let oldMemoMap = /* @__PURE__ */ new WeakMap();
  let newMemoMap = /* @__PURE__ */ new WeakMap();
  const updateElementTree = (element, newChildAbstracts, oldChildAbstracts, elementAbstract) => {
    var _a, _b, _c;
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
                  ...oldChildAbstracts.splice(
                    oldIndex,
                    1
                  )
                );
              }
              if (newAbstract.t) {
                updateAttributes(
                  element.childNodes[newIndex],
                  newAbstract.a,
                  oldAbstract.a
                );
                updateElementTree(
                  element.childNodes[newIndex],
                  newAbstract.c,
                  oldAbstract.c,
                  oldAbstract
                );
              } else {
                if (oldAbstract !== newAbstract) {
                  element.childNodes[newIndex].textContent = newAbstract;
                }
              }
              break;
            }
          }
        }
        if (!matched) {
          let childElement;
          if (newAbstract.t) {
            childElement = document.createElement(
              newAbstract.t
            );
            if (newAbstract.a) {
              updateAttributes(
                childElement,
                newAbstract.a
              );
            }
            if (newAbstract.c) {
              updateElementTree(
                childElement,
                newAbstract.c
              );
            }
            const insertAdjacentElement = (element2, elementAbstract2, position) => {
              if (position && (!elementAbstract2 || elementAbstract2.t)) {
                element2.insertAdjacentElement(
                  position,
                  childElement
                );
              } else {
                element2.parentNode.insertBefore(
                  childElement,
                  element2
                );
              }
            };
            if (newIndex === 0) {
              insertAdjacentElement(
                element,
                elementAbstract,
                "afterbegin"
              );
            } else if (((_a = oldChildAbstracts == null ? void 0 : oldChildAbstracts.length) != null ? _a : 0) + newCount > newIndex) {
              insertAdjacentElement(
                element.childNodes[newIndex]
                // (oldChildAbstracts as NodeContent[])[newIndex + newCount],
                // 'beforebegin',
              );
            } else {
              insertAdjacentElement(
                element,
                elementAbstract,
                "beforeend"
              );
            }
          } else {
            const insertAdjacentText = (element2, elementAbstract2, position) => {
              if (position && (!elementAbstract2 || elementAbstract2.t)) {
                element2.insertAdjacentText(
                  position,
                  newAbstract
                );
              } else {
                element2.parentNode.insertBefore(
                  document.createTextNode(newAbstract),
                  element2
                );
              }
            };
            if (newIndex === 0) {
              insertAdjacentText(
                element,
                elementAbstract,
                "afterbegin"
              );
            } else if (((_b = oldChildAbstracts == null ? void 0 : oldChildAbstracts.length) != null ? _b : 0) + newCount > newIndex) {
              insertAdjacentText(
                element.childNodes[newIndex]
                // (oldChildAbstracts as NodeContent[])[newIndex + newCount],
                // 'beforebegin',
              );
            } else {
              insertAdjacentText(
                element,
                elementAbstract,
                "beforeend"
              );
            }
          }
          newCount++;
        }
      }
    }
    const elementLength = ((_c = oldChildAbstracts == null ? void 0 : oldChildAbstracts.length) != null ? _c : 0) + newCount;
    if (elementLength >= newIndex) {
      for (let i = elementLength - 1; i >= newIndex; i--) {
        element.childNodes[i].remove();
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
      oldAbstractTree = void 0;
    }
  }
  oldAbstractTree != null ? oldAbstractTree : oldAbstractTree = childrenToNodes(_rootElement);
  let active = true, updating = false;
  const updateAbstracts = () => {
    if (active && !updating && updatePromise) {
      updating = true;
      updatePromise = null;
      let newAbstractTree = arrayifyOrUndefined(
        renderView(state)
      );
      updateElementTree(
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
export {
  memo,
  mount,
  node
};
//# sourceMappingURL=staark.base.js.map
