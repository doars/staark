// ../../packages/staark-common/src/marker.ts
var marker = Symbol();

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

// ../../packages/staark-common/src/element.ts
var childrenToNodes = (element) => {
  var _a;
  const abstractChildNodes = [];
  for (let i = 0; i < element.childNodes.length; i++) {
    const childNode = element.childNodes[i];
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        (_a = childNode.textContent) != null ? _a : ""
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

// ../../packages/staark-patch/src/library/patch.ts
var MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
var HYPHENATE = (part, offset) => (offset ? "-" : "") + part;
var updateAttributes = (element, newAttributes, oldAttributes) => {
  if (newAttributes) {
    for (const name in newAttributes) {
      let value = newAttributes[name];
      if (value) {
        const type = typeof value;
        if (type === "function") {
          element.addEventListener(name, value);
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
var prepare = (rootElement, oldAbstractTree) => {
  const updateElementTree = (element, newChildAbstracts, oldChildAbstracts, elementAbstract) => {
    var _a, _b, _c;
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
  return (newAbstractTree) => {
    newAbstractTree = arrayify(newAbstractTree);
    updateElementTree(
      _rootElement,
      newAbstractTree,
      oldAbstractTree
    );
    oldAbstractTree = newAbstractTree;
  };
};
export {
  node,
  prepare
};
//# sourceMappingURL=staark-patch.base.js.map