"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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

  // ../staark-common/src/marker.ts
  var marker = Symbol();

  // ../staark-common/src/node.ts
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

  // ../staark-common/dst/staark-common.js
  var SUFFIX_MULTIPLE = "[]";
  var suffixNameIfMultiple = (attributes) => {
    if (attributes.multiple && attributes.name && !attributes.name.endsWith(SUFFIX_MULTIPLE)) {
      attributes.name += SUFFIX_MULTIPLE;
    }
  };
  var marker2 = Symbol();
  var node2 = (type, attributesOrContents, contents) => {
    if (typeof attributesOrContents !== "object" || attributesOrContents._ === marker2 || Array.isArray(attributesOrContents)) {
      contents = attributesOrContents;
      attributesOrContents = void 0;
    }
    return {
      _: marker2,
      a: attributesOrContents,
      c: contents ? Array.isArray(contents) ? contents : [contents] : [],
      t: type.toUpperCase()
    };
  };
  var factory2 = new Proxy({}, {
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = (type[0] + type.substring(1).replace(
        /([A-Z])/g,
        (capital) => "-" + capital
      )).toUpperCase();
      return target[type] = (attributesOrContents, contents) => node2(
        typeConverted,
        attributesOrContents,
        contents
      );
    }
  });
  var BRACKET_CLOSE2 = "]";
  var BRACKET_OPEN2 = "[";
  var DOT2 = ".";
  var EQUAL2 = "=";
  var HASH2 = "#";
  var QUOTE_SINGLE2 = "'";
  var QUOTE_DOUBLE2 = '"';
  var selectorToTokenizer2 = (selector) => {
    const length = selector.length;
    let i = 0;
    let type = "";
    const attributes = {};
    let tokenA = "";
    let tokenB = true;
    let tokenType = 3;
    const storeToken = () => {
      if (tokenA) {
        switch (tokenType) {
          case 0:
            attributes[tokenA] = tokenB === true ? true : tokenB;
            tokenB = true;
            break;
          case 1:
            if (!attributes.class) {
              attributes.class = tokenA;
              break;
            }
            attributes.class += " " + tokenA;
            break;
          case 2:
            attributes.id = tokenA;
            break;
          case 3:
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
        if (character === EQUAL2) {
          tokenB = "";
          character = selector[i];
          const endOnDoubleQuote = character === QUOTE_DOUBLE2;
          const endOnSingleQuote = character === QUOTE_SINGLE2;
          if (endOnDoubleQuote || endOnSingleQuote) {
            tokenB += character;
            i++;
          }
          while (i < length) {
            character = selector[i];
            if (endOnDoubleQuote && character === QUOTE_DOUBLE2 || endOnSingleQuote && character === QUOTE_SINGLE2) {
              tokenB += character;
              i++;
              break;
            } else if (!endOnDoubleQuote && !endOnSingleQuote && character === BRACKET_CLOSE2) {
              break;
            }
            tokenB += character;
            i++;
          }
          if (tokenB[0] === QUOTE_DOUBLE2 && tokenB[tokenB.length - 1] === QUOTE_DOUBLE2 || tokenB[0] === QUOTE_SINGLE2 && tokenB[tokenB.length - 1] === QUOTE_SINGLE2) {
            tokenB = tokenB.substring(1, tokenB.length - 1);
          }
          while (i < length) {
            character = selector[i];
            i++;
            if (character === BRACKET_CLOSE2) {
              break;
            }
          }
          break;
        } else if (character === BRACKET_OPEN2) {
          attributeBracketCount++;
          continue;
        } else if (character === BRACKET_CLOSE2) {
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
      if (character === HASH2) {
        storeToken();
        tokenType = 2;
        continue;
      } else if (character === DOT2) {
        storeToken();
        tokenType = 1;
        continue;
      } else if (character === BRACKET_OPEN2) {
        storeToken();
        tokenType = 0;
        parseAttribute();
        continue;
      }
      tokenA += character;
    }
    return [type, attributes];
  };
  var fctory2 = new Proxy({}, {
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
          const [_, _attributes] = selectorToTokenizer2(selector);
          attributes = _attributes;
        }
        return node2(
          typeConverted,
          attributes,
          contents
        );
      };
    }
  });
  var identifierCount = 0;
  var uniqueIdentifier = () => "-" + identifierCount++;

  // src/scripts/inputField.ts
  var COMPONENT_CLASS = " staark-component-input";
  var inputField = (state, attributes, label) => {
    state = Object.assign({
      value: attributes.value || ""
    }, state);
    attributes.class = (attributes.class || "") + COMPONENT_CLASS;
    if (!attributes.type) {
      attributes.type = "text" /* text */;
    }
    attributes.value = state.value;
    suffixNameIfMultiple(attributes);
    const onChange = attributes.change;
    attributes.change = (event) => {
      state.value = event.target.value;
      if (onChange) {
        onChange(event);
      }
    };
    if (typeof label === "string") {
      label = {
        label
      };
    }
    if (label && !label.append && (attributes.type === "checkbox" /* checkbox */ || attributes.type === "radio" /* radio */)) {
      label.append = true;
    }
    const contents = [
      node2("input", attributes)
    ];
    if (label) {
      if (!attributes.id) {
        attributes.id = "auto-id" + uniqueIdentifier();
      }
      const labelAttributes = {
        for: attributes.id
      };
      if (attributes.type === "checkbox" /* checkbox */ || attributes.type === "radio" /* radio */) {
        labelAttributes.tabindex = 0;
        labelAttributes.click = (event) => {
          event.target.previousSibling.focus();
        };
      }
      const labelAbstract = node2(
        "label",
        labelAttributes,
        label.label
      );
      if (label && label.append) {
        contents.push(labelAbstract);
      } else {
        contents.unshift(labelAbstract);
      }
    }
    return contents;
  };

  // src/scripts/inputList.ts
  var inputList = (state, options, items) => {
    var _a, _b, _c;
    state = Object.assign({
      query: options.searchValue,
      selected: options.selected ? [...options.selected] : []
    }, state);
    let contents = [];
    const inputOptions = {
      appendLabel: true,
      multiple: options.multiple,
      name: options.name,
      type: options.multiple ? "checkbox" /* checkbox */ : "radio" /* radio */,
      change: (event) => {
        event.target.focus();
        const target = event.target;
        if (!target.checked) {
          const index = state.selected.indexOf(target.value);
          if (index >= 0) {
            state.selected.splice(index, 1);
          }
        } else if (options.multiple) {
          if (state.selected.indexOf(target.value) < 0) {
            state.selected.push(target.value);
          }
        } else {
          state.selected = [target.value];
        }
        if (options.selectedChange) {
          options.selectedChange([...state.selected]);
        }
      }
    };
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (state.query && (item.label && item.label.indexOf(state.query) < 0 || item.value.indexOf(state.query) < 0)) {
        continue;
      }
      const itemOptions = __spreadProps(__spreadValues({}, inputOptions), {
        value: item.value
      });
      if (state.selected.indexOf(item.value) >= 0) {
        itemOptions.checked = true;
      }
      if (item.id) {
        itemOptions.id = item.id;
      }
      contents.push(
        ...inputField(
          itemOptions,
          (_a = item.label) != null ? _a : item.value
          // TODO: When the label is clicked put the focus on the input element.
        )
      );
    }
    if (options.selectNoneLabel && state.selected.length > 0) {
      contents.unshift(
        node("button", {
          click: () => {
            state.selected = [];
            if (options.selectedChange) {
              options.selectedChange([...state.selected]);
            }
          },
          type: "button"
        }, options.selectNoneLabel)
      );
    }
    if (options.selectAllLabel && state.selected.length !== items.length) {
      contents.unshift(
        node("button", {
          click: () => {
            const selected = [];
            for (const item of items) {
              state.selected.push(item.value);
            }
            state.selected = selected;
            if (options.selectedChange) {
              options.selectedChange(selected);
            }
          },
          type: "button"
        }, options.selectAllLabel)
      );
    }
    if (options.search && (typeof options.search === "boolean" || items.length >= options.search)) {
      if (state.query) {
        contents.unshift(
          node("button", {
            click: (event) => {
              event.target.previousSibling.focus();
              state.query = null;
              if (options.searchChange) {
                options.searchChange(state.query);
              }
            },
            type: "button"
          }, (_b = options.searchResetLabel) != null ? _b : "\xD7")
        );
      }
      const searchOptions = {
        type: "search" /* search */,
        value: state.query,
        keyup: (event) => {
          state.query = event.target.value;
          if (options.searchChange) {
            options.searchChange(state.query);
          }
        }
      };
      if (options.searchPlaceholder) {
        searchOptions.placeholder = options.searchPlaceholder;
      }
      contents.unshift(
        ...inputField(searchOptions, options.searchLabel)
      );
    }
    contents = [
      node("div", {}, contents)
    ];
    if (options.preview) {
      const previewOptions = {
        readonly: true,
        tabindex: -1,
        type: "text" /* text */
      };
      const labels = [];
      for (const item of items) {
        if (state.selected.indexOf(item.value) >= 0) {
          labels.push((_c = item.label) != null ? _c : item.value);
        }
      }
      previewOptions.value = labels.join(", ");
      contents.unshift(
        ...inputField(previewOptions, options.previewLabel)
      );
    }
    if (options.legend) {
      contents.unshift(
        node("legend", {
          click: (event) => {
            event.target.parentNode.focus();
          }
        }, options.legend)
      );
    }
    const fieldAttributes = {
      tabindex: 0
    };
    if (options.class) {
      fieldAttributes.class = options.class;
    }
    return node("fieldset", fieldAttributes, contents);
  };

  // src/index.iife.ts
  iife([
    "staark",
    "components"
  ], {
    // inputFile,
    inputList
  });
})();
//# sourceMappingURL=staark-components.iife.js.map
