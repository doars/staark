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
  var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

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

  // src/library/patch.js
  var updateAttributes = (element, newAttributes, oldAttributes) => {
    if (newAttributes) {
      for (const name in newAttributes) {
        let value = newAttributes[name];
        if (value) {
          const type = typeof value;
          if (type === "function") {
            const oldValue = oldAttributes?.[name];
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
                  if (!value[styleName]) {
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
  var updateChildren = (element, newChildAbstracts, oldChildAbstracts) => {
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
      updateChildren(
        _rootElement,
        newAbstractTree,
        oldAbstractTree
      );
      oldAbstractTree = newAbstractTree;
    };
  };

  // src/index.base.iife.js
  iife([
    "staark"
  ], {
    node,
    prepare
  });
})();
//# sourceMappingURL=staark-patch.base.iife.js.map
