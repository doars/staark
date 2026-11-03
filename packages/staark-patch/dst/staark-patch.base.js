// ../staark-common/src/array.js
var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : void 0;

// ../staark-common/src/marker.js
var marker = "n";

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

// ../staark-common/src/attribute.js
var attributeToString = (name, value) => typeof value === "string" ? value : name === "class" && typeof value === "object" ? Array.isArray(value) ? value.join(" ") : Object.keys(value).filter((className) => value[className]).join(" ") : `${value}`;

// ../staark-common/src/element.js
var childrenToNodes = (element) => {
  const abstractChildNodes = [];
  for (const childNode of element.childNodes) {
    if (childNode instanceof Text) {
      abstractChildNodes.push(childNode.textContent ?? "");
    } else {
      const attributes = {};
      for (const attribute of childNode.attributes ?? []) {
        attributes[attribute.name] = attribute.value;
      }
      abstractChildNodes.push(
        node(
          childNode.localName ?? childNode.nodeName,
          attributes,
          childrenToNodes(childNode)
        )
      );
    }
  }
  return abstractChildNodes;
};

// ../staark-common/src/sequence.js
var increasingSubsequence = (sources) => {
  const tails = [];
  const previous = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    if (source === void 0) {
      continue;
    }
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = low + high >> 1;
      if (sources[tails[middle]] < source) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous[index] = low ? tails[low - 1] : -1;
    tails[low] = index;
  }
  const included = [];
  for (let index = tails[tails.length - 1]; index >= 0; index = previous[index]) {
    included[index] = true;
  }
  return included;
};

// src/library/patch.js
var updateAttributes = (element, newAttributes, oldAttributes) => {
  if (newAttributes) {
    for (const name in newAttributes) {
      if (name !== "key" && Object.hasOwn(newAttributes, name)) {
        let value = newAttributes[name];
        const oldValue = oldAttributes?.[name];
        if (value !== null && value !== void 0 && value !== false) {
          const type = typeof value;
          if (type === "function") {
            if (oldValue !== value) {
              if (typeof oldValue === "function") {
                element.removeEventListener(name, oldValue);
              }
              element.addEventListener(name, value);
            }
          } else if (name === "style" && type === "object") {
            const oldStyle = oldValue && typeof oldValue === "object" ? oldValue : null;
            if (!oldStyle) {
              element.style.cssText = "";
            }
            for (const styleName in value) {
              const styleValue = value[styleName];
              if (Object.hasOwn(value, styleName) && oldStyle?.[styleName] !== styleValue) {
                if (styleName.includes("-", 1)) {
                  element.style.setProperty(styleName, styleValue);
                } else {
                  element.style[styleName] = styleValue;
                }
              }
            }
            if (oldStyle) {
              for (const styleName in oldStyle) {
                if (Object.hasOwn(oldStyle, styleName) && !Object.hasOwn(value, styleName)) {
                  if (styleName.includes("-", 1)) {
                    element.style.removeProperty(styleName);
                  } else {
                    element.style[styleName] = "";
                  }
                }
              }
            }
          } else if (value !== oldValue || name === "value") {
            value = attributeToString(name, value);
            if (oldValue === null || oldValue === void 0 || oldValue === false || attributeToString(name, oldValue) !== value) {
              element.setAttribute(name, value);
            }
            if (name === "value" && element.value !== value) {
              element.value = value;
            }
          }
        }
      }
    }
  }
  if (oldAttributes) {
    for (const name in oldAttributes) {
      if (name !== "key" && Object.hasOwn(oldAttributes, name)) {
        const value = oldAttributes[name];
        const newValue = newAttributes?.[name];
        if (newValue === null || newValue === void 0 || newValue === false) {
          if (typeof value === "function") {
            element.removeEventListener(name, value);
          } else {
            element.removeAttribute(name);
            if (name === "value") {
              element.value = "";
            }
          }
        }
      }
    }
  }
};
var prepare = (rootElement, oldAbstractTree) => {
  const setBefore = "moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
  const getKey = (abstract) => abstract?.a?.key;
  let updateChildren;
  const createNode = (abstract, inSvg) => {
    if (!abstract.t) {
      return document.createTextNode(abstract);
    }
    inSvg = inSvg || abstract.t === "SVG" || abstract.t === "svg";
    const element = inSvg ? document.createElementNS("http://www.w3.org/2000/svg", abstract.t) : document.createElement(abstract.t);
    updateAttributes(element, abstract.a);
    updateChildren(element, abstract.c, void 0, inSvg);
    return element;
  };
  const updateNode = (node2, newAbstract, oldAbstract, inSvg) => {
    if (newAbstract === oldAbstract) {
      return;
    }
    if (newAbstract.t) {
      updateAttributes(node2, newAbstract.a, oldAbstract.a);
      updateChildren(
        node2,
        newAbstract.c,
        oldAbstract.c,
        inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg"
      );
    } else {
      node2.textContent = newAbstract;
    }
  };
  updateChildren = (element, newChildAbstracts = [], oldChildAbstracts = [], inSvg) => {
    const newLength = newChildAbstracts.length;
    const oldLength = oldChildAbstracts.length;
    let start = 0;
    let node2 = element.firstChild;
    for (; start < newLength && start < oldLength; start++) {
      const newAbstract = newChildAbstracts[start];
      const oldAbstract = oldChildAbstracts[start];
      if (newAbstract.t !== oldAbstract.t || getKey(newAbstract) !== getKey(oldAbstract)) {
        break;
      }
      updateNode(node2, newAbstract, oldAbstract, inSvg);
      node2 = node2.nextSibling;
    }
    if (start === oldLength) {
      for (; start < newLength; start++) {
        element.insertBefore(createNode(newChildAbstracts[start], inSvg), node2);
      }
      return;
    }
    const oldNodes = [];
    for (let index = start; index < oldLength; index++) {
      oldNodes[index] = node2;
      node2 = node2?.nextSibling;
    }
    const keyedIndexes = /* @__PURE__ */ new Map();
    const unkeyedIndexes = /* @__PURE__ */ new Map();
    for (let index = oldLength; index-- > start; ) {
      const abstract = oldChildAbstracts[index];
      const key = getKey(abstract);
      if (key != null) {
        keyedIndexes.set(key, index);
      } else {
        let indexes = unkeyedIndexes.get(abstract.t);
        if (!indexes) {
          indexes = [];
          unkeyedIndexes.set(abstract.t, indexes);
        }
        indexes.push(index);
      }
    }
    const newNodes = [];
    const sources = [];
    for (let index = start; index < newLength; index++) {
      const newAbstract = newChildAbstracts[index];
      const key = getKey(newAbstract);
      const oldIndex = key != null ? keyedIndexes.get(key) : unkeyedIndexes.get(newAbstract.t)?.pop();
      const oldNode = oldNodes[oldIndex];
      if (oldNode && oldChildAbstracts[oldIndex].t === newAbstract.t) {
        oldNodes[oldIndex] = null;
        newNodes[index] = oldNode;
        sources[index] = oldIndex;
        updateNode(oldNode, newAbstract, oldChildAbstracts[oldIndex], inSvg);
      }
    }
    for (let index = start; index < oldLength; index++) {
      oldNodes[index]?.remove();
    }
    const stable = increasingSubsequence(sources);
    let next = null;
    for (let index = newLength; index-- > start; ) {
      let child = newNodes[index];
      if (!child) {
        child = createNode(newChildAbstracts[index], inSvg);
        element.insertBefore(child, next);
      } else if (!stable[index]) {
        element[setBefore](child, next);
      }
      next = child;
    }
  };
  rootElement = typeof rootElement === "string" ? document.querySelector(rootElement) || document.body.appendChild(document.createElement("div")) : rootElement;
  if (typeof oldAbstractTree === "string") {
    try {
      oldAbstractTree = JSON.parse(oldAbstractTree);
    } catch (_error) {
      oldAbstractTree = null;
    }
  }
  if (!oldAbstractTree) {
    oldAbstractTree = childrenToNodes(rootElement);
  }
  return (newAbstractTree) => {
    newAbstractTree = arrayifyOrUndefined(newAbstractTree);
    updateChildren(rootElement, newAbstractTree, oldAbstractTree);
    oldAbstractTree = newAbstractTree;
  };
};
export {
  node,
  prepare
};
//# sourceMappingURL=staark-patch.base.js.map
