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

  // ../staark-common/src/array.ts
  var arrayify = (data) => {
    var _a;
    return (_a = arrayifyOrUndefined(data)) != null ? _a : [];
  };
  var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

  // ../staark-common/src/conditional.ts
  var conditional = (condition, onTruth, onFalse) => {
    let result = condition ? onTruth : onFalse;
    if (typeof result === "function") {
      result = result();
    }
    return arrayify(result);
  };

  // ../staark-common/src/marker.ts
  var marker = "n";

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

  // ../staark-common/src/factory.ts
  var factory = new Proxy({}, {
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

  // ../staark-common/src/selector.ts
  var BRACKET_CLOSE = "]";
  var BRACKET_OPEN = "[";
  var DOT = ".";
  var EQUAL = "=";
  var HASH = "#";
  var QUOTE_SINGLE = "'";
  var QUOTE_DOUBLE = '"';
  var selectorToTokenizer = (selector) => {
    const length = selector.length;
    let i = 0;
    let type = "";
    const attributes = {};
    let tokenA = "";
    let tokenB = true;
    let tokenType = 3 /* type */;
    const storeToken = () => {
      if (tokenA) {
        switch (tokenType) {
          case 0 /* attribute */:
            attributes[tokenA] = tokenB === true ? true : tokenB;
            tokenB = true;
            break;
          case 1 /* class */:
            if (!attributes.class) {
              attributes.class = tokenA;
              break;
            }
            attributes.class += " " + tokenA;
            break;
          case 2 /* id */:
            attributes.id = tokenA;
            break;
          case 3 /* type */:
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
        tokenType = 2 /* id */;
        continue;
      } else if (character === DOT) {
        storeToken();
        tokenType = 1 /* class */;
        continue;
      } else if (character === BRACKET_OPEN) {
        storeToken();
        tokenType = 0 /* attribute */;
        parseAttribute();
        continue;
      }
      tokenA += character;
    }
    return [type, attributes];
  };

  // ../staark-common/src/fctory.ts
  var fctory = new Proxy({}, {
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

  // ../staark-common/src/identifier.ts
  var identifierCount = 0;
  var identifier = (prefix) => prefix + "-" + identifierCount++;

  // ../staark-common/src/match.ts
  var match = (pattern, lookup, fallback) => {
    let result;
    if (lookup && pattern in lookup && lookup[pattern]) {
      result = lookup[pattern];
      if (typeof result === "function") {
        result = result();
      }
    } else {
      result = fallback;
    }
    return arrayify(result);
  };

  // ../staark-common/src/nde.ts
  var nde = (selector, contents) => {
    const [type, attributes] = selectorToTokenizer(selector);
    return {
      _: marker,
      a: attributes,
      c: arrayifyOrUndefined(contents),
      t: type.toUpperCase()
    };
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

  // src/library/patch.ts
  var updateAttributes = (element, newAttributes, oldAttributes) => {
    if (newAttributes) {
      for (const name in newAttributes) {
        let value = newAttributes[name];
        if (value) {
          const type = typeof value;
          if (type === "function") {
            const oldValue = oldAttributes == null ? void 0 : oldAttributes[name];
            if (oldValue !== value) {
              if (oldValue) {
                element.removeEventListener(
                  name,
                  oldValue
                );
              }
              element.addEventListener(
                name,
                value
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
        if (!newAttributes || !newAttributes[name]) {
          if (typeof oldAttributes[name] === "function") {
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
  var updateElementTree = (element, newChildAbstracts, oldChildAbstracts) => {
    let newIndex = 0;
    let newCount = 0;
    if (newChildAbstracts) {
      for (; newIndex < newChildAbstracts.length; newIndex++) {
        const newAbstract = newChildAbstracts[newIndex];
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
                updateElementTree(
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
            updateElementTree(
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
  var prepare = (rootElement, oldAbstractTree) => {
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
    return (newAbstractTree) => {
      newAbstractTree = arrayifyOrUndefined(newAbstractTree);
      updateElementTree(
        _rootElement,
        newAbstractTree,
        oldAbstractTree
      );
      oldAbstractTree = newAbstractTree;
    };
  };

  // src/index.iife.ts
  iife([
    "staark"
  ], {
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
