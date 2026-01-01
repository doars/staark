// ../staark-common/src/array.js
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : undefined;

// ../staark-common/src/marker.js
var marker = "n";

// ../staark-common/src/node.js
var node = (type, attributesOrContents, contents) => {
  if (attributesOrContents && (typeof attributesOrContents !== "object" || attributesOrContents._ === marker || Array.isArray(attributesOrContents))) {
    contents = attributesOrContents;
    attributesOrContents = undefined;
  }
  return {
    _: marker,
    a: attributesOrContents,
    c: arrayifyOrUndefined(contents),
    t: type
  };
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
      abstractChildNodes.push(node(childNode.nodeName, attributes, childrenToNodes(childNode)));
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
              element.removeEventListener(name, oldValue);
            }
            element.addEventListener(name, value);
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
                element.style.setProperty(styleName, styleValue);
              } else {
                element.style[styleName] = styleValue;
              }
            }
            if (oldAttributes && oldAttributes[name] && typeof oldAttributes[name] === "object" && !Array.isArray(oldAttributes[name])) {
              for (let styleName in oldAttributes[name]) {
                if (!value[styleName]) {
                  if (styleName.includes("-", 1)) {
                    element.style.removeProperty(styleName);
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
            if (name === "value") {
              element.value = value;
            }
          }
        }
      }
    }
  }
  if (oldAttributes) {
    for (const name in oldAttributes) {
      if (!newAttributes || !newAttributes[name]) {
        if (typeof oldAttributes[name] === "function") {
          element.removeEventListener(name, oldAttributes[name]);
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
var prepare = (rootElement, oldAbstractTree) => {
  const setBefore = "moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
  const updateChildren = (element, newChildAbstracts, oldChildAbstracts, inSvg) => {
    let newIndex = 0;
    let newCount = 0;
    if (newChildAbstracts) {
      for (;newIndex < newChildAbstracts.length; newIndex++) {
        const newAbstract = newChildAbstracts[newIndex];
        let matched = false;
        if (oldChildAbstracts) {
          for (let oldIndex = newIndex - newCount;oldIndex < oldChildAbstracts.length; oldIndex++) {
            const oldAbstract = oldChildAbstracts[oldIndex];
            if (oldAbstract.t && newAbstract.t === oldAbstract.t || !oldAbstract.t && !newAbstract.t) {
              matched = true;
              if (newIndex !== oldIndex + newCount) {
                element[setBefore](element.childNodes[oldIndex + newCount], element.childNodes[newIndex]);
                oldChildAbstracts.splice(newIndex - newCount, 0, oldChildAbstracts.splice(oldIndex, 1)[0]);
              }
              if (newAbstract.t) {
                updateAttributes(element.childNodes[newIndex], newAbstract.a, oldAbstract.a);
                updateChildren(element.childNodes[newIndex], newAbstract.c, oldAbstract.c, inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg");
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
            let _inSvg = inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg";
            if (_inSvg) {
              newNode = document.createElementNS("http://www.w3.org/2000/svg", newAbstract.t);
            } else {
              newNode = document.createElement(newAbstract.t);
            }
            updateAttributes(newNode, newAbstract.a);
            updateChildren(newNode, newAbstract.c, undefined, _inSvg);
          } else {
            newNode = document.createTextNode(newAbstract);
          }
          element.insertBefore(newNode, element.childNodes[newIndex]);
          newCount++;
        }
      }
    }
    if (oldChildAbstracts) {
      const elementLength = oldChildAbstracts.length + newCount;
      if (elementLength >= newIndex) {
        for (let i = elementLength - 1;i >= newIndex; i--) {
          element.childNodes[i].remove();
        }
      }
    }
  };
  const _rootElement = typeof rootElement === "string" ? document.querySelector(rootElement) || document.body.appendChild(document.createElement("div")) : rootElement;
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
    updateChildren(_rootElement, newAbstractTree, oldAbstractTree);
    oldAbstractTree = newAbstractTree;
  };
};
export {
  prepare,
  node
};

//# debugId=12F84AEA3698AF0864756E2164756E21
