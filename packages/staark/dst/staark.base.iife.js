"use strict";
(() => {
  // ../../.scripts/iife.ts
  var iife = function(path, data) {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

  // src/library/marker.ts
  var marker = Symbol();

  // src/library/memo.ts
  var memo = (render, memory) => ({
    _: marker,
    r: render,
    m: memory
  });

  // src/utilities/array.ts
  var arrayify = function(data) {
    if (Array.isArray(data)) {
      return data;
    }
    return [
      data
    ];
  };

  // src/utilities/clone.ts
  var cloneRecursive = (value) => {
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        const clone = [];
        for (let i = 0; i < value.length; i++) {
          clone.push(cloneRecursive(value[i]));
        }
        value = clone;
      } else {
        const clone = {};
        for (const key in value) {
          clone[key] = cloneRecursive(value[key]);
        }
        value = clone;
      }
    }
    return value;
  };

  // src/utilities/compare.ts
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

  // src/utilities/proxy.ts
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
          if (!Reflect.has(target2, key)) {
            return true;
          }
          remove(target2);
          const deleted = Reflect.deleteProperty(target2, key);
          if (deleted) {
            onChange();
          }
          return deleted;
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
    return {
      // Add initial root.
      p: add(root),
      // Stop dispatcher by removing root.
      s: () => remove(root)
    };
  };

  // src/library/mount.ts
  var MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
  var HYPHENATE = (part, offset) => (offset ? "-" : "") + part;
  var mount = (rootNode, renderView, initialState) => {
    if (!initialState) {
      initialState = {};
    }
    let active = true, updating = false;
    let _rootNode;
    const unmount = () => {
      if (active) {
        active = false;
        if (_rootNode) {
          for (let i = _rootNode.childNodes.length - 1; i >= 0; i--) {
            _rootNode.childNodes[i].remove();
          }
        }
      }
    };
    _rootNode = typeof rootNode === "string" ? document.querySelector(rootNode) : rootNode;
    if (!_rootNode) {
      throw new Error("no root found");
    }
    unmount();
    active = true;
    if (!_rootNode) {
      _rootNode = document.createElement("div");
      document.body.appendChild(_rootNode);
    }
    let listenerCount = 0;
    const updateAttributes = (element, newAttributes = null, oldAttributes = null) => {
      if (newAttributes) {
        for (const name in newAttributes) {
          let value = newAttributes[name];
          if (value !== null) {
            const type = typeof value;
            if (type === "function") {
              const listener = newAttributes[name] = (event) => {
                listenerCount++;
                value(event);
                listenerCount--;
                updateAbstracts();
              };
              element.addEventListener(name, listener);
              continue;
            } else {
              if (type === "boolean") {
                value = value ? "true" : "false";
              } else if (type !== "string") {
                value = value.toString();
              }
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
                      } else if (value) {
                        styles += ";" + styleProperty + ":" + value;
                      }
                    }
                    value = styles;
                  }
                }
              } else if (name === "value" && element.value !== value) {
                element.value = value;
              } else if (name === "checked") {
                element.checked = newAttributes[name];
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
          } else if (!newAttributes || !(name in newAttributes) || newAttributes[name] === null || newAttributes[name] === void 0) {
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
              state.p,
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
      return cloneRecursive(
        match.c
      );
    };
    const updateElementTree = (element, newChildAbstracts = null, oldChildAbstracts = null) => {
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
                if (newIndex !== oldIndex) {
                  element.insertBefore(
                    element.childNodes[oldIndex + newCount],
                    element.childNodes[newIndex]
                  );
                  oldAbstractTree.splice(
                    newIndex - newCount,
                    0,
                    ...oldAbstractTree.splice(
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
                    oldAbstract.c
                  );
                } else {
                  element.childNodes[newIndex].textContent = typeof newAbstract === "string" ? newAbstract : newAbstract.c;
                }
                break;
              }
            }
          }
          if (!matched) {
            if (newAbstract.t) {
              const childElement = document.createElement(
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
              if (element.childNodes.length > newIndex) {
                element.childNodes[newIndex].insertAdjacentElement(
                  "afterend",
                  childElement
                );
              } else {
                element.insertAdjacentElement(
                  "beforeend",
                  childElement
                );
              }
              newCount++;
            } else {
              const childElement = typeof newAbstract === "string" ? newAbstract : newAbstract.c;
              if (element.childNodes.length > newIndex) {
                element.childNodes[newIndex].insertAdjacentText(
                  "afterend",
                  childElement
                );
              } else {
                element.insertAdjacentText(
                  "beforeend",
                  childElement
                );
              }
              newCount++;
            }
          }
        }
      }
      if (element.childNodes.length >= newIndex) {
        for (let i = element.childNodes.length - 1; i >= newIndex; i--) {
          element.childNodes[i].remove();
        }
      }
    };
    let proxyChanged = true;
    const state = proxify(
      initialState,
      () => {
        proxyChanged = true;
        requestAnimationFrame(
          updateAbstracts
        );
      }
    );
    let oldAbstractTree = [];
    const updateAbstracts = () => {
      if (active && !updating && // Only update if changes to the state have been made.
      proxyChanged && // Don't update while handling listeners.
      listenerCount <= 0) {
        updating = true;
        proxyChanged = false;
        let newAbstractTree = arrayify(
          renderView(state.p)
        );
        updateElementTree(
          _rootNode,
          newAbstractTree,
          oldAbstractTree
        );
        oldAbstractTree = newAbstractTree;
        oldMemoList = newMemoList;
        newMemoList = [];
        updating = false;
        if (proxyChanged) {
          throw new Error("proxy changed during rendering");
        }
      }
    };
    updateAbstracts();
    return [
      updateAbstracts,
      unmount
    ];
  };

  // src/library/node.ts
  var node = (type, attributesOrContents, contents) => {
    if (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents)) {
      contents = attributesOrContents;
      attributesOrContents = void 0;
    }
    return {
      _: marker,
      a: attributesOrContents,
      c: Array.isArray(contents) ? contents : [contents],
      t: type.toUpperCase()
    };
  };

  // src/index.base.iife.ts
  iife([
    "staark"
  ], {
    memo,
    mount,
    node
  });
})();
//# sourceMappingURL=staark.base.iife.js.map
