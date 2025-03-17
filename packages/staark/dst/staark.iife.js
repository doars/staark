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

  // ../staark-common/src/factory.js
  var factory = new Proxy({}, {
    /**
     * @param {FactoryCache} target
     * @param {string} type
     * @returns {Factory}
     */
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = (type[0] + type.substring(1).replace(
        /([A-Z])/g,
        (capital) => "-" + capital
      )).toUpperCase();
      return target[type] = (attributesOrContents, contents) => node(
        typeConverted,
        attributesOrContents,
        contents
      );
    }
  });

  // ../staark-common/src/selector.js
  var BRACKET_CLOSE = "]";
  var BRACKET_OPEN = "[";
  var DOT = ".";
  var EQUAL = "=";
  var HASH = "#";
  var QUOTE_SINGLE = "'";
  var QUOTE_DOUBLE = '"';
  var TokenTypes = {
    attribute: 0,
    class: 1,
    id: 2,
    type: 3
  };
  var selectorToTokenizer = (selector) => {
    const length = selector.length;
    let i = 0;
    let type = "";
    const attributes = {};
    let tokenA = "";
    let tokenB = true;
    let tokenType = TokenTypes.type;
    const storeToken = () => {
      if (tokenA) {
        switch (tokenType) {
          case TokenTypes.attribute:
            attributes[tokenA] = tokenB === true ? true : tokenB;
            tokenB = true;
            break;
          case TokenTypes.class:
            if (!attributes.class) {
              attributes.class = tokenA;
              break;
            }
            attributes.class += " " + tokenA;
            break;
          case TokenTypes.id:
            attributes.id = tokenA;
            break;
          case TokenTypes.type:
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
        tokenType = TokenTypes.id;
        continue;
      } else if (character === DOT) {
        storeToken();
        tokenType = TokenTypes.class;
        continue;
      } else if (character === BRACKET_OPEN) {
        storeToken();
        tokenType = TokenTypes.attribute;
        parseAttribute();
        continue;
      }
      tokenA += character;
    }
    return [type, attributes];
  };

  // ../staark-common/src/fctory.js
  var fctory = new Proxy({}, {
    /**
     * @param {FctoryCache} target
     * @param {string} type
     * @returns {Fctory}
     */
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = (type[0] + type.substring(1).replace(
        /([A-Z])/g,
        (capital) => "-" + capital
      )).toUpperCase();
      return target[type] = (selector, contents) => {
        let attributes;
        if (selector) {
          const [_, _attributes] = selectorToTokenizer(selector);
          attributes = _attributes;
        }
        return node(
          typeConverted,
          attributes,
          contents
        );
      };
    }
  });

  // ../staark-common/src/identifier.js
  var identifierCount = 0;
  var identifier = (prefix) => prefix + "-" + identifierCount++;

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
       * @param {Record<string, any>} target
       * @param {string} key
       * @returns {boolean}
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
       * @param {Record<string, any>} target
       * @param {string} key
       * @param {any} value
       * @returns {boolean}
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
              if (oldValue?.f !== value) {
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
                    if (!(styleName in value)) {
                      if (styleName.includes("-")) {
                        element.style.removeProperty(
                          styleName
                        );
                      } else {
                        delete element.style[styleName];
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
            let match2 = oldMemoMap.get(
              newAbstract.r
            );
            if (!match2 || !equalRecursive(match2.m, newAbstract.m)) {
              match2 = {
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
            newMemoMap.set(newAbstract.r, match2);
            newChildAbstracts.splice(
              newIndex,
              1,
              ...cloneRecursive(
                match2.c
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

  // src/index.iife.js
  iife([
    "staark"
  ], {
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
