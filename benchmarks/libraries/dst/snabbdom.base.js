// ../../node_modules/snabbdom/build/htmldomapi.js
function createElement(tagName2, options) {
  return document.createElement(tagName2, options);
}
function createElementNS(namespaceURI, qualifiedName, options) {
  return document.createElementNS(namespaceURI, qualifiedName, options);
}
function createDocumentFragment() {
  return parseFragment(document.createDocumentFragment());
}
function createTextNode(text) {
  return document.createTextNode(text);
}
function createComment(text) {
  return document.createComment(text);
}
function insertBefore(parentNode2, newNode, referenceNode) {
  if (isDocumentFragment(parentNode2)) {
    let node = parentNode2;
    while (node && isDocumentFragment(node)) {
      const fragment2 = parseFragment(node);
      node = fragment2.parent;
    }
    parentNode2 = node !== null && node !== void 0 ? node : parentNode2;
  }
  if (isDocumentFragment(newNode)) {
    newNode = parseFragment(newNode, parentNode2);
  }
  if (referenceNode && isDocumentFragment(referenceNode)) {
    referenceNode = parseFragment(referenceNode).firstChildNode;
  }
  parentNode2.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
  node.removeChild(child);
}
function appendChild(node, child) {
  if (isDocumentFragment(child)) {
    child = parseFragment(child, node);
  }
  node.appendChild(child);
}
function parentNode(node) {
  if (isDocumentFragment(node)) {
    while (node && isDocumentFragment(node)) {
      const fragment2 = parseFragment(node);
      node = fragment2.parent;
    }
    return node !== null && node !== void 0 ? node : null;
  }
  return node.parentNode;
}
function nextSibling(node) {
  var _a;
  if (isDocumentFragment(node)) {
    const fragment2 = parseFragment(node);
    const parent = parentNode(fragment2);
    if (parent && fragment2.lastChildNode) {
      const children = Array.from(parent.childNodes);
      const index = children.indexOf(fragment2.lastChildNode);
      return (_a = children[index + 1]) !== null && _a !== void 0 ? _a : null;
    }
    return null;
  }
  return node.nextSibling;
}
function tagName(elm) {
  return elm.tagName;
}
function setTextContent(node, text) {
  node.textContent = text;
}
function getTextContent(node) {
  return node.textContent;
}
function isElement(node) {
  return node.nodeType === 1;
}
function isText(node) {
  return node.nodeType === 3;
}
function isComment(node) {
  return node.nodeType === 8;
}
function isDocumentFragment(node) {
  return node.nodeType === 11;
}
function parseFragment(fragmentNode, parentNode2) {
  var _a, _b, _c;
  const fragment2 = fragmentNode;
  (_a = fragment2.parent) !== null && _a !== void 0 ? _a : fragment2.parent = parentNode2 !== null && parentNode2 !== void 0 ? parentNode2 : null;
  (_b = fragment2.firstChildNode) !== null && _b !== void 0 ? _b : fragment2.firstChildNode = fragmentNode.firstChild;
  (_c = fragment2.lastChildNode) !== null && _c !== void 0 ? _c : fragment2.lastChildNode = fragmentNode.lastChild;
  return fragment2;
}
var htmlDomApi = {
  createElement,
  createElementNS,
  createTextNode,
  createDocumentFragment,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
  isDocumentFragment
};

// ../../node_modules/snabbdom/build/vnode.js
function vnode(sel, data, children, text, elm) {
  const key = data === void 0 ? void 0 : data.key;
  return { sel, data, children, text, elm, key };
}

// ../../node_modules/snabbdom/build/is.js
var array = Array.isArray;
function primitive(s) {
  return typeof s === "string" || typeof s === "number" || s instanceof String || s instanceof Number;
}

// ../../node_modules/snabbdom/build/init.js
function isUndef(s) {
  return s === void 0;
}
function isDef(s) {
  return s !== void 0;
}
var emptyNode = vnode("", {}, [], void 0, void 0);
function sameVnode(vnode1, vnode2) {
  var _a, _b;
  const isSameKey = vnode1.key === vnode2.key;
  const isSameIs = ((_a = vnode1.data) === null || _a === void 0 ? void 0 : _a.is) === ((_b = vnode2.data) === null || _b === void 0 ? void 0 : _b.is);
  const isSameSel = vnode1.sel === vnode2.sel;
  const isSameTextOrFragment = !vnode1.sel && vnode1.sel === vnode2.sel ? typeof vnode1.text === typeof vnode2.text : true;
  return isSameSel && isSameKey && isSameIs && isSameTextOrFragment;
}
function documentFragmentIsNotSupported() {
  throw new Error("The document fragment is not supported on this platform.");
}
function isElement2(api, vnode2) {
  return api.isElement(vnode2);
}
function isDocumentFragment2(api, vnode2) {
  return api.isDocumentFragment(vnode2);
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
  var _a;
  const map = {};
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = (_a = children[i]) === null || _a === void 0 ? void 0 : _a.key;
    if (key !== void 0) {
      map[key] = i;
    }
  }
  return map;
}
var hooks = [
  "create",
  "update",
  "remove",
  "destroy",
  "pre",
  "post"
];
function init(modules, domApi, options) {
  const cbs = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: []
  };
  const api = domApi !== void 0 ? domApi : htmlDomApi;
  for (const hook of hooks) {
    for (const module of modules) {
      const currentHook = module[hook];
      if (currentHook !== void 0) {
        cbs[hook].push(currentHook);
      }
    }
  }
  function emptyNodeAt(elm) {
    const id = elm.id ? "#" + elm.id : "";
    const classes = elm.getAttribute("class");
    const c = classes ? "." + classes.split(" ").join(".") : "";
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], void 0, elm);
  }
  function emptyDocumentFragmentAt(frag) {
    return vnode(void 0, {}, [], void 0, frag);
  }
  function createRmCb(childElm, listeners) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm);
        if (parent !== null) {
          api.removeChild(parent, childElm);
        }
      }
    };
  }
  function createElm(vnode2, insertedVnodeQueue) {
    var _a, _b, _c, _d;
    let i;
    let data = vnode2.data;
    if (data !== void 0) {
      const init3 = (_a = data.hook) === null || _a === void 0 ? void 0 : _a.init;
      if (isDef(init3)) {
        init3(vnode2);
        data = vnode2.data;
      }
    }
    const children = vnode2.children;
    const sel = vnode2.sel;
    if (sel === "!") {
      if (isUndef(vnode2.text)) {
        vnode2.text = "";
      }
      vnode2.elm = api.createComment(vnode2.text);
    } else if (sel === "") {
      vnode2.elm = api.createTextNode(vnode2.text);
    } else if (sel !== void 0) {
      const hashIdx = sel.indexOf("#");
      const dotIdx = sel.indexOf(".", hashIdx);
      const hash = hashIdx > 0 ? hashIdx : sel.length;
      const dot = dotIdx > 0 ? dotIdx : sel.length;
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      const elm = vnode2.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag, data) : api.createElement(tag, data);
      if (hash < dot)
        elm.setAttribute("id", sel.slice(hash + 1, dot));
      if (dotIdx > 0)
        elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));
      for (i = 0; i < cbs.create.length; ++i)
        cbs.create[i](emptyNode, vnode2);
      if (primitive(vnode2.text) && (!array(children) || children.length === 0)) {
        api.appendChild(elm, api.createTextNode(vnode2.text));
      }
      if (array(children)) {
        for (i = 0; i < children.length; ++i) {
          const ch = children[i];
          if (ch != null) {
            api.appendChild(elm, createElm(ch, insertedVnodeQueue));
          }
        }
      }
      const hook = vnode2.data.hook;
      if (isDef(hook)) {
        (_b = hook.create) === null || _b === void 0 ? void 0 : _b.call(hook, emptyNode, vnode2);
        if (hook.insert) {
          insertedVnodeQueue.push(vnode2);
        }
      }
    } else if (((_c = options === null || options === void 0 ? void 0 : options.experimental) === null || _c === void 0 ? void 0 : _c.fragments) && vnode2.children) {
      vnode2.elm = ((_d = api.createDocumentFragment) !== null && _d !== void 0 ? _d : documentFragmentIsNotSupported)();
      for (i = 0; i < cbs.create.length; ++i)
        cbs.create[i](emptyNode, vnode2);
      for (i = 0; i < vnode2.children.length; ++i) {
        const ch = vnode2.children[i];
        if (ch != null) {
          api.appendChild(vnode2.elm, createElm(ch, insertedVnodeQueue));
        }
      }
    } else {
      vnode2.elm = api.createTextNode(vnode2.text);
    }
    return vnode2.elm;
  }
  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }
  function invokeDestroyHook(vnode2) {
    var _a, _b;
    const data = vnode2.data;
    if (data !== void 0) {
      (_b = (_a = data === null || data === void 0 ? void 0 : data.hook) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a, vnode2);
      for (let i = 0; i < cbs.destroy.length; ++i)
        cbs.destroy[i](vnode2);
      if (vnode2.children !== void 0) {
        for (let j = 0; j < vnode2.children.length; ++j) {
          const child = vnode2.children[j];
          if (child != null && typeof child !== "string") {
            invokeDestroyHook(child);
          }
        }
      }
    }
  }
  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    var _a, _b;
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners;
      let rm;
      const ch = vnodes[startIdx];
      if (ch != null) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (let i = 0; i < cbs.remove.length; ++i)
            cbs.remove[i](ch, rm);
          const removeHook = (_b = (_a = ch === null || ch === void 0 ? void 0 : ch.data) === null || _a === void 0 ? void 0 : _a.hook) === null || _b === void 0 ? void 0 : _b.remove;
          if (isDef(removeHook)) {
            removeHook(ch, rm);
          } else {
            rm();
          }
        } else if (ch.children) {
          invokeDestroyHook(ch);
          removeVnodes(parentElm, ch.children, 0, ch.children.length - 1);
        } else {
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }
  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx;
    let idxInOld;
    let elmToMove;
    let before;
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx];
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (oldKeyToIdx === void 0) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) {
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else if (isUndef(oldKeyToIdx[newEndVnode.key])) {
          api.insertBefore(parentElm, createElm(newEndVnode, insertedVnodeQueue), api.nextSibling(oldEndVnode.elm));
          newEndVnode = newCh[--newEndIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          } else {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            oldCh[idxInOld] = void 0;
            api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (newStartIdx <= newEndIdx) {
      before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    }
    if (oldStartIdx <= oldEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
  function patchVnode(oldVnode, vnode2, insertedVnodeQueue) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const hook = (_a = vnode2.data) === null || _a === void 0 ? void 0 : _a.hook;
    (_b = hook === null || hook === void 0 ? void 0 : hook.prepatch) === null || _b === void 0 ? void 0 : _b.call(hook, oldVnode, vnode2);
    const elm = vnode2.elm = oldVnode.elm;
    if (oldVnode === vnode2)
      return;
    if (vnode2.data !== void 0 || isDef(vnode2.text) && vnode2.text !== oldVnode.text) {
      (_c = vnode2.data) !== null && _c !== void 0 ? _c : vnode2.data = {};
      (_d = oldVnode.data) !== null && _d !== void 0 ? _d : oldVnode.data = {};
      for (let i = 0; i < cbs.update.length; ++i)
        cbs.update[i](oldVnode, vnode2);
      (_g = (_f = (_e = vnode2.data) === null || _e === void 0 ? void 0 : _e.hook) === null || _f === void 0 ? void 0 : _f.update) === null || _g === void 0 ? void 0 : _g.call(_f, oldVnode, vnode2);
    }
    const oldCh = oldVnode.children;
    const ch = vnode2.children;
    if (isUndef(vnode2.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch)
          updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text))
          api.setTextContent(elm, "");
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, "");
      }
    } else if (oldVnode.text !== vnode2.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      }
      api.setTextContent(elm, vnode2.text);
    }
    (_h = hook === null || hook === void 0 ? void 0 : hook.postpatch) === null || _h === void 0 ? void 0 : _h.call(hook, oldVnode, vnode2);
  }
  return function patch(oldVnode, vnode2) {
    let i, elm, parent;
    const insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i)
      cbs.pre[i]();
    if (isElement2(api, oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode);
    } else if (isDocumentFragment2(api, oldVnode)) {
      oldVnode = emptyDocumentFragmentAt(oldVnode);
    }
    if (sameVnode(oldVnode, vnode2)) {
      patchVnode(oldVnode, vnode2, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);
      createElm(vnode2, insertedVnodeQueue);
      if (parent !== null) {
        api.insertBefore(parent, vnode2.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i)
      cbs.post[i]();
    return vnode2;
  };
}

// ../../node_modules/snabbdom/build/h.js
function addNS(data, children, sel) {
  data.ns = "http://www.w3.org/2000/svg";
  if (sel !== "foreignObject" && children !== void 0) {
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (typeof child === "string")
        continue;
      const childData = child.data;
      if (childData !== void 0) {
        addNS(childData, child.children, child.sel);
      }
    }
  }
}
function h(sel, b, c) {
  let data = {};
  let children;
  let text;
  let i;
  if (c !== void 0) {
    if (b !== null) {
      data = b;
    }
    if (array(c)) {
      children = c;
    } else if (primitive(c)) {
      text = c.toString();
    } else if (c && c.sel) {
      children = [c];
    }
  } else if (b !== void 0 && b !== null) {
    if (array(b)) {
      children = b;
    } else if (primitive(b)) {
      text = b.toString();
    } else if (b && b.sel) {
      children = [b];
    } else {
      data = b;
    }
  }
  if (children !== void 0) {
    for (i = 0; i < children.length; ++i) {
      if (primitive(children[i]))
        children[i] = vnode(void 0, void 0, void 0, children[i], void 0);
    }
  }
  if (sel.startsWith("svg") && (sel.length === 3 || sel[3] === "." || sel[3] === "#")) {
    addNS(data, children, sel);
  }
  return vnode(sel, data, children, text, void 0);
}
function fragment(children) {
  let c;
  let text;
  if (array(children)) {
    c = children;
  } else if (primitive(c)) {
    text = children;
  } else if (c && c.sel) {
    c = [children];
  }
  if (c !== void 0) {
    for (let i = 0; i < c.length; ++i) {
      if (primitive(c[i]))
        c[i] = vnode(void 0, void 0, void 0, c[i], void 0);
    }
  }
  return vnode(void 0, {}, c, text, void 0);
}

// ../../node_modules/snabbdom/build/thunk.js
function copyToThunk(vnode2, thunk3) {
  var _a;
  const ns = (_a = thunk3.data) === null || _a === void 0 ? void 0 : _a.ns;
  vnode2.data.fn = thunk3.data.fn;
  vnode2.data.args = thunk3.data.args;
  thunk3.data = vnode2.data;
  thunk3.children = vnode2.children;
  thunk3.text = vnode2.text;
  thunk3.elm = vnode2.elm;
  if (ns)
    addNS(thunk3.data, thunk3.children, thunk3.sel);
}
function init2(thunk3) {
  const cur = thunk3.data;
  const vnode2 = cur.fn(...cur.args);
  copyToThunk(vnode2, thunk3);
}
function prepatch(oldVnode, thunk3) {
  let i;
  const old = oldVnode.data;
  const cur = thunk3.data;
  const oldArgs = old.args;
  const args = cur.args;
  if (old.fn !== cur.fn || oldArgs.length !== args.length) {
    copyToThunk(cur.fn(...args), thunk3);
    return;
  }
  for (i = 0; i < args.length; ++i) {
    if (oldArgs[i] !== args[i]) {
      copyToThunk(cur.fn(...args), thunk3);
      return;
    }
  }
  copyToThunk(oldVnode, thunk3);
}
var thunk = function thunk2(sel, key, fn, args) {
  if (args === void 0) {
    args = fn;
    fn = key;
    key = void 0;
  }
  return h(sel, {
    key,
    hook: { init: init2, prepatch },
    fn,
    args
  });
};

// ../../node_modules/snabbdom/build/helpers/attachto.js
function pre(vnode2, newVnode) {
  const attachData = vnode2.data.attachData;
  newVnode.data.attachData.placeholder = attachData.placeholder;
  newVnode.data.attachData.real = attachData.real;
  vnode2.elm = vnode2.data.attachData.real;
}
function post(_, vnode2) {
  vnode2.elm = vnode2.data.attachData.placeholder;
}
function destroy(vnode2) {
  if (vnode2.elm !== void 0) {
    vnode2.elm.parentNode.removeChild(vnode2.elm);
  }
  vnode2.elm = vnode2.data.attachData.real;
}
function create(_, vnode2) {
  const real = vnode2.elm;
  const attachData = vnode2.data.attachData;
  const placeholder = document.createElement("span");
  vnode2.elm = placeholder;
  attachData.target.appendChild(real);
  attachData.real = real;
  attachData.placeholder = placeholder;
}
function attachTo(target, vnode2) {
  if (vnode2.data === void 0)
    vnode2.data = {};
  if (vnode2.data.hook === void 0)
    vnode2.data.hook = {};
  const data = vnode2.data;
  const hook = vnode2.data.hook;
  data.attachData = { target, placeholder: void 0, real: void 0 };
  hook.create = create;
  hook.prepatch = pre;
  hook.postpatch = post;
  hook.destroy = destroy;
  return vnode2;
}

// ../../node_modules/snabbdom/build/tovnode.js
function toVNode(node, domApi) {
  const api = domApi !== void 0 ? domApi : htmlDomApi;
  let text;
  if (api.isElement(node)) {
    const id = node.id ? "#" + node.id : "";
    const cn = node.getAttribute("class");
    const c = cn ? "." + cn.split(" ").join(".") : "";
    const sel = api.tagName(node).toLowerCase() + id + c;
    const attrs = {};
    const dataset = {};
    const data = {};
    const children = [];
    let name;
    let i, n;
    const elmAttrs = node.attributes;
    const elmChildren = node.childNodes;
    for (i = 0, n = elmAttrs.length; i < n; i++) {
      name = elmAttrs[i].nodeName;
      if (name.startsWith("data-")) {
        dataset[name.slice(5)] = elmAttrs[i].nodeValue || "";
      } else if (name !== "id" && name !== "class") {
        attrs[name] = elmAttrs[i].nodeValue;
      }
    }
    for (i = 0, n = elmChildren.length; i < n; i++) {
      children.push(toVNode(elmChildren[i], domApi));
    }
    if (Object.keys(attrs).length > 0)
      data.attrs = attrs;
    if (Object.keys(dataset).length > 0)
      data.dataset = dataset;
    if (sel.startsWith("svg") && (sel.length === 3 || sel[3] === "." || sel[3] === "#")) {
      addNS(data, children, sel);
    }
    return vnode(sel, data, children, void 0, node);
  } else if (api.isText(node)) {
    text = api.getTextContent(node);
    return vnode(void 0, void 0, void 0, text, node);
  } else if (api.isComment(node)) {
    text = api.getTextContent(node);
    return vnode("!", {}, [], text, node);
  } else {
    return vnode("", {}, [], void 0, node);
  }
}

// ../../node_modules/snabbdom/build/modules/attributes.js
var xlinkNS = "http://www.w3.org/1999/xlink";
var xmlnsNS = "http://www.w3.org/2000/xmlns/";
var xmlNS = "http://www.w3.org/XML/1998/namespace";
var colonChar = 58;
var xChar = 120;
var mChar = 109;
function updateAttrs(oldVnode, vnode2) {
  let key;
  const elm = vnode2.elm;
  let oldAttrs = oldVnode.data.attrs;
  let attrs = vnode2.data.attrs;
  if (!oldAttrs && !attrs)
    return;
  if (oldAttrs === attrs)
    return;
  oldAttrs = oldAttrs || {};
  attrs = attrs || {};
  for (key in attrs) {
    const cur = attrs[key];
    const old = oldAttrs[key];
    if (old !== cur) {
      if (cur === true) {
        elm.setAttribute(key, "");
      } else if (cur === false) {
        elm.removeAttribute(key);
      } else {
        if (key.charCodeAt(0) !== xChar) {
          elm.setAttribute(key, cur);
        } else if (key.charCodeAt(3) === colonChar) {
          elm.setAttributeNS(xmlNS, key, cur);
        } else if (key.charCodeAt(5) === colonChar) {
          key.charCodeAt(1) === mChar ? elm.setAttributeNS(xmlnsNS, key, cur) : elm.setAttributeNS(xlinkNS, key, cur);
        } else {
          elm.setAttribute(key, cur);
        }
      }
    }
  }
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}
var attributesModule = {
  create: updateAttrs,
  update: updateAttrs
};

// ../../node_modules/snabbdom/build/modules/class.js
function updateClass(oldVnode, vnode2) {
  let cur;
  let name;
  const elm = vnode2.elm;
  let oldClass = oldVnode.data.class;
  let klass = vnode2.data.class;
  if (!oldClass && !klass)
    return;
  if (oldClass === klass)
    return;
  oldClass = oldClass || {};
  klass = klass || {};
  for (name in oldClass) {
    if (oldClass[name] && !Object.prototype.hasOwnProperty.call(klass, name)) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? "add" : "remove"](name);
    }
  }
}
var classModule = { create: updateClass, update: updateClass };

// ../../node_modules/snabbdom/build/modules/dataset.js
var CAPS_REGEX = /[A-Z]/g;
function updateDataset(oldVnode, vnode2) {
  const elm = vnode2.elm;
  let oldDataset = oldVnode.data.dataset;
  let dataset = vnode2.data.dataset;
  let key;
  if (!oldDataset && !dataset)
    return;
  if (oldDataset === dataset)
    return;
  oldDataset = oldDataset || {};
  dataset = dataset || {};
  const d = elm.dataset;
  for (key in oldDataset) {
    if (!(key in dataset)) {
      if (d) {
        if (key in d) {
          delete d[key];
        }
      } else {
        elm.removeAttribute("data-" + key.replace(CAPS_REGEX, "-$&").toLowerCase());
      }
    }
  }
  for (key in dataset) {
    if (oldDataset[key] !== dataset[key]) {
      if (d) {
        d[key] = dataset[key];
      } else {
        elm.setAttribute("data-" + key.replace(CAPS_REGEX, "-$&").toLowerCase(), dataset[key]);
      }
    }
  }
}
var datasetModule = {
  create: updateDataset,
  update: updateDataset
};

// ../../node_modules/snabbdom/build/modules/eventlisteners.js
function invokeHandler(handler, vnode2, event) {
  if (typeof handler === "function") {
    handler.call(vnode2, event, vnode2);
  } else if (typeof handler === "object") {
    for (let i = 0; i < handler.length; i++) {
      invokeHandler(handler[i], vnode2, event);
    }
  }
}
function handleEvent(event, vnode2) {
  const name = event.type;
  const on = vnode2.data.on;
  if (on && on[name]) {
    invokeHandler(on[name], vnode2, event);
  }
}
function createListener() {
  return function handler(event) {
    handleEvent(event, handler.vnode);
  };
}
function updateEventListeners(oldVnode, vnode2) {
  const oldOn = oldVnode.data.on;
  const oldListener = oldVnode.listener;
  const oldElm = oldVnode.elm;
  const on = vnode2 && vnode2.data.on;
  const elm = vnode2 && vnode2.elm;
  let name;
  if (oldOn === on) {
    return;
  }
  if (oldOn && oldListener) {
    if (!on) {
      for (name in oldOn) {
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      for (name in oldOn) {
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }
  if (on) {
    const listener = vnode2.listener = oldVnode.listener || createListener();
    listener.vnode = vnode2;
    if (!oldOn) {
      for (name in on) {
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        if (!oldOn[name]) {
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}
var eventListenersModule = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
};

// ../../node_modules/snabbdom/build/modules/props.js
function updateProps(oldVnode, vnode2) {
  let key;
  let cur;
  let old;
  const elm = vnode2.elm;
  let oldProps = oldVnode.data.props;
  let props = vnode2.data.props;
  if (!oldProps && !props)
    return;
  if (oldProps === props)
    return;
  oldProps = oldProps || {};
  props = props || {};
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== "value" || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}
var propsModule = { create: updateProps, update: updateProps };

// ../../node_modules/snabbdom/build/modules/style.js
var raf = typeof (window === null || window === void 0 ? void 0 : window.requestAnimationFrame) === "function" ? window.requestAnimationFrame.bind(window) : setTimeout;
var nextFrame = function(fn) {
  raf(function() {
    raf(fn);
  });
};
var reflowForced = false;
function setNextFrame(obj, prop, val) {
  nextFrame(function() {
    obj[prop] = val;
  });
}
function updateStyle(oldVnode, vnode2) {
  let cur;
  let name;
  const elm = vnode2.elm;
  let oldStyle = oldVnode.data.style;
  let style = vnode2.data.style;
  if (!oldStyle && !style)
    return;
  if (oldStyle === style)
    return;
  oldStyle = oldStyle || {};
  style = style || {};
  const oldHasDel = "delayed" in oldStyle;
  for (name in oldStyle) {
    if (!(name in style)) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.removeProperty(name);
      } else {
        elm.style[name] = "";
      }
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === "delayed" && style.delayed) {
      for (const name2 in style.delayed) {
        cur = style.delayed[name2];
        if (!oldHasDel || cur !== oldStyle.delayed[name2]) {
          setNextFrame(elm.style, name2, cur);
        }
      }
    } else if (name !== "remove" && cur !== oldStyle[name]) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.setProperty(name, cur);
      } else {
        elm.style[name] = cur;
      }
    }
  }
}
function applyDestroyStyle(vnode2) {
  let style;
  let name;
  const elm = vnode2.elm;
  const s = vnode2.data.style;
  if (!s || !(style = s.destroy))
    return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}
function applyRemoveStyle(vnode2, rm) {
  const s = vnode2.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  if (!reflowForced) {
    vnode2.elm.offsetLeft;
    reflowForced = true;
  }
  let name;
  const elm = vnode2.elm;
  let i = 0;
  const style = s.remove;
  let amount = 0;
  const applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  const compStyle = getComputedStyle(elm);
  const props = compStyle["transition-property"].split(", ");
  for (; i < props.length; ++i) {
    if (applied.indexOf(props[i]) !== -1)
      amount++;
  }
  elm.addEventListener("transitionend", function(ev) {
    if (ev.target === elm)
      --amount;
    if (amount === 0)
      rm();
  });
}
function forceReflow() {
  reflowForced = false;
}
var styleModule = {
  pre: forceReflow,
  create: updateStyle,
  update: updateStyle,
  destroy: applyDestroyStyle,
  remove: applyRemoveStyle
};

// ../../node_modules/snabbdom/build/jsx.js
function Fragment(data, ...children) {
  const flatChildren = flattenAndFilter(children, []);
  if (flatChildren.length === 1 && !flatChildren[0].sel && flatChildren[0].text) {
    return vnode(void 0, void 0, void 0, flatChildren[0].text, void 0);
  } else {
    return vnode(void 0, data !== null && data !== void 0 ? data : {}, flatChildren, void 0, void 0);
  }
}
function flattenAndFilter(children, flattened) {
  for (const child of children) {
    if (child !== void 0 && child !== null && child !== false && child !== "") {
      if (Array.isArray(child)) {
        flattenAndFilter(child, flattened);
      } else if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
        flattened.push(vnode(void 0, void 0, void 0, String(child), void 0));
      } else {
        flattened.push(child);
      }
    }
  }
  return flattened;
}
function jsx(tag, data, ...children) {
  const flatChildren = flattenAndFilter(children, []);
  if (typeof tag === "function") {
    return tag(data, flatChildren);
  } else {
    if (flatChildren.length === 1 && !flatChildren[0].sel && flatChildren[0].text) {
      return h(tag, data, flatChildren[0].text);
    } else {
      return h(tag, data, flatChildren);
    }
  }
}
export {
  Fragment,
  array,
  attachTo,
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  fragment,
  h,
  htmlDomApi,
  init,
  jsx,
  primitive,
  propsModule,
  styleModule,
  thunk,
  toVNode,
  vnode
};
//# sourceMappingURL=snabbdom.base.js.map
