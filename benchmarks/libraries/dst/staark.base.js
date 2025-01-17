// ../../packages/staark-common/src/marker.ts
var marker = Symbol();

// ../../packages/staark-common/src/memo.ts
var memo = (render, memory) => ({
  _: marker,
  r: render,
  m: memory
});

// ../../packages/staark-common/src/node.ts
var node = (type, attributesOrContents, contents) => {
  if (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents)) {
    contents = attributesOrContents;
    attributesOrContents = void 0;
  }
  return {
    _: marker,
    a: attributesOrContents,
    c: contents ? Array.isArray(contents) ? contents : [contents] : [],
    t: type.toUpperCase()
  };
};

// ../../packages/staark-common/src/array.ts
var arrayify = function(data) {
  if (Array.isArray(data)) {
    return data;
  }
  return [
    data
  ];
};

// ../../packages/staark-common/src/compare.ts
var equalRecursive = (valueA, valueB) => {
  if (valueA === valueB) {
    return true;
  }
  if (valueA instanceof Date && valueB instanceof Date) {
    return valueA.getTime() === valueB.getTime();
  }
  if (!valueA || !valueB || typeof valueA !== "object" && typeof valueB !== "object") {
    return valueA === valueB;
  }
  if (valueA === null || valueA === void 0 || valueB === null || valueB === void 0) {
    return false;
  }
  if (valueA.prototype !== valueB.prototype) {
    return false;
  }
  let keys = Object.keys(valueA);
  if (keys.length !== Object.keys(valueB).length) {
    return false;
  }
  return keys.every(
    (key) => equalRecursive(valueA[key], valueB[key])
  );
};

// ../../packages/staark-common/src/element.ts
var childrenToNodes = (element) => {
  const abstractChildNodes = [];
  for (let i = 0; i < element.childNodes.length; i++) {
    const childNode = element.childNodes[i];
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        childNode.textContent ?? ""
      );
    } else {
      let attributes = {};
      for (let i2 = 0; i2 < childNode.attributes.length; i2++) {
        const attribute = childNode.attributes[i2];
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

// ../../packages/staark/src/utilities/proxy.ts
var proxify = (root, onChange) => {
  const map = /* @__PURE__ */ new WeakMap();
  const remove = (target) => {
    if (map.has(target)) {
      const revocable = map.get(target);
      map.delete(revocable);
      for (const property in revocable.proxy) {
        if (typeof revocable.proxy[property] === "object") {
          remove(revocable.proxy[property]);
        }
      }
      revocable.revoke();
    }
  };
  const add = (target) => {
    if (map.has(target)) {
      return map.get(target);
    }
    for (const key in target) {
      if (target[key] && typeof target[key] === "object") {
        target[key] = add(target[key]);
      }
    }
    const revocable = Proxy.revocable(target, {
      deleteProperty: (target2, key) => {
        if (Reflect.has(target2, key)) {
          remove(target2);
          const deleted = Reflect.deleteProperty(target2, key);
          if (deleted) {
            onChange();
          }
          return deleted;
        }
        return true;
      },
      set: (target2, key, value) => {
        const existingValue = target2[key];
        if (existingValue !== value) {
          if (typeof existingValue === "object") {
            remove(existingValue);
          }
          if (value && typeof value === "object") {
            value = add(value);
          }
          target2[key] = value;
          onChange();
        }
        return true;
      }
    });
    map.set(revocable, target);
    return revocable.proxy;
  };
  return add(root);
};

// ../../packages/staark/src/library/mount.ts
var MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
var HYPHENATE = (part, offset) => (offset ? "-" : "") + part;
var mount = (rootElement, renderView, initialState, oldAbstractTree) => {
  let listenerCount = 0;
  const updateAttributes = (element, newAttributes, oldAttributes) => {
    if (newAttributes) {
      for (const name in newAttributes) {
        let value = newAttributes[name];
        if (value) {
          const type = typeof value;
          if (type === "function") {
            const listener = newAttributes[name] = (event) => {
              listenerCount++;
              try {
                value(event);
              } catch (error) {
                console.error("listener error", error);
              }
              listenerCount--;
              updateAbstracts();
            };
            element.addEventListener(name, listener);
            continue;
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
            } else if (name === "style") {
              if (typeof value === "object") {
                if (Array.isArray(value)) {
                  value = value.join(";");
                } else {
                  let styles = "";
                  for (let styleProperty in value) {
                    let styleValue = value[styleProperty];
                    styleProperty = styleProperty.replace(MATCH_CAPITALS, HYPHENATE).toLowerCase();
                    if (Array.isArray(styleValue)) {
                      styles += ";" + styleProperty + ":" + styleValue.join(" ");
                    } else if (styleValue) {
                      styles += ";" + styleProperty + ":" + styleValue;
                    }
                  }
                  value = styles;
                }
              }
            } else {
              if (type === "boolean") {
                if (!value) {
                  element.removeAttribute(name);
                  continue;
                }
                value = "true";
              } else if (type !== "string") {
                value = value.toString();
              }
              if (name === "value" && element.value !== value) {
                element.value = value;
              } else if (name === "checked") {
                element.checked = newAttributes[name];
              }
            }
            element.setAttribute(name, value);
          }
        }
      }
    }
    if (oldAttributes) {
      for (const name in oldAttributes) {
        if (typeof oldAttributes[name] === "function") {
          element.removeEventListener(
            name,
            oldAttributes[name]
          );
        } else if (!newAttributes || !(name in newAttributes) || !newAttributes[name]) {
          if (name === "value") {
            element.value = "";
          } else if (name === "checked") {
            element.checked = false;
          }
          element.removeAttribute(name);
        }
      }
    }
  };
  let oldMemoList = [];
  let newMemoList = [];
  const resolveMemoization = (memoAbstract) => {
    let match = oldMemoList.find((oldMemo) => oldMemo.r === memoAbstract.r && equalRecursive(oldMemo.m, memoAbstract.m));
    if (!match) {
      match = {
        c: arrayify(
          memoAbstract.r(
            state,
            memoAbstract.m
          )
        ),
        m: memoAbstract.m,
        r: memoAbstract.r
      };
    }
    if (!newMemoList.includes(match)) {
      newMemoList.push(match);
    }
    return structuredClone(
      match.c
    );
  };
  const updateElementTree = (element, newChildAbstracts, oldChildAbstracts, elementAbstract) => {
    let newIndex = 0;
    let newCount = 0;
    if (newChildAbstracts) {
      for (; newIndex < newChildAbstracts.length; newIndex++) {
        const newAbstract = newChildAbstracts[newIndex];
        if (newAbstract.r) {
          const memoAbstracts = resolveMemoization(
            newAbstract
          );
          newChildAbstracts.splice(
            newIndex,
            1,
            ...memoAbstracts
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
                element.childNodes[newIndex].textContent = typeof newAbstract === "string" ? newAbstract : newAbstract.c;
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
            } else if ((oldChildAbstracts?.length ?? 0) + newCount > newIndex) {
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
            childElement = typeof newAbstract === "string" ? newAbstract : newAbstract.c;
            const insertAdjacentText = (element2, elementAbstract2, position) => {
              if (position && (!elementAbstract2 || elementAbstract2.t)) {
                element2.insertAdjacentText(
                  position,
                  childElement
                );
              } else {
                element2.parentNode.insertBefore(
                  document.createTextNode(childElement),
                  element2.nextSibling
                );
              }
            };
            if (newIndex === 0) {
              insertAdjacentText(
                element,
                elementAbstract,
                "afterbegin"
              );
            } else if ((oldChildAbstracts?.length ?? 0) + newCount > newIndex) {
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
    const elementLength = (oldChildAbstracts?.length ?? 0) + newCount;
    if (elementLength >= newIndex) {
      for (let i = elementLength - 1; i >= newIndex; i--) {
        element.childNodes[i].remove();
      }
    }
  };
  if (typeof initialState === "string") {
    initialState = JSON.parse(initialState);
  }
  initialState ??= {};
  let proxyChanged = true;
  const triggerUpdate = () => {
    if (!proxyChanged) {
      proxyChanged = true;
      Promise.resolve().then(updateAbstracts);
    }
  };
  let state = Object.getPrototypeOf(initialState) === Proxy.prototype ? initialState : proxify(
    initialState,
    triggerUpdate
  );
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
  oldAbstractTree ??= childrenToNodes(_rootElement);
  let active = true, updating = false;
  const updateAbstracts = () => {
    if (active && !updating && // Only update if changes to the state have been made.
    proxyChanged && // Don't update while handling listeners.
    listenerCount <= 0) {
      updating = true;
      proxyChanged = false;
      let newAbstractTree = arrayify(
        renderView(state)
      );
      updateElementTree(
        _rootElement,
        newAbstractTree,
        oldAbstractTree
      );
      oldAbstractTree = newAbstractTree;
      oldMemoList = newMemoList;
      newMemoList = [];
      updating = false;
      if (proxyChanged) {
        throw new Error("update during render");
      }
    }
  };
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
