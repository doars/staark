(() => {
  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    for (let i = 0;i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
  };

  // ../staark-common/src/array.js
  var arrayify = (data) => arrayifyOrUndefined(data) || [];
  var arrayifyOrUndefined = (data) => data ? Array.isArray(data) ? data : [data] : undefined;

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

  // ../staark-common/src/factory.js
  var factory = /* @__PURE__ */ new Proxy({}, {
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = type[0].toLowerCase() + type.substring(1).replace(/([A-Z])/g, (capital) => "-" + capital.toLowerCase());
      return target[type] = (attributesOrContents, contents) => node(typeConverted, attributesOrContents, contents);
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
    storeToken();
    return [type, attributes];
  };

  // ../staark-common/src/fctory.js
  var fctory = /* @__PURE__ */ new Proxy({}, {
    get: (target, type) => {
      if (target[type]) {
        return target[type];
      }
      const typeConverted = type[0].toLowerCase() + type.substring(1).replace(/([A-Z])/g, (capital) => "-" + capital.toLowerCase());
      return target[type] = (selector, contents) => {
        let attributes;
        if (selector) {
          const [_, _attributes] = selectorToTokenizer(selector);
          attributes = _attributes;
        }
        return node(typeConverted, attributes, contents);
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
      t: type
    };
  };

  // src/library/stringify.js
  var SELF_CLOSING = [
    "base",
    "br",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "wbr"
  ];
  var MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
  var HYPHENATE = (part, offset) => (offset ? "-" : "") + part;
  var renderAttributes = (attributes) => {
    let rendered = "";
    if (attributes) {
      for (const name in attributes) {
        let value = attributes[name];
        if (value !== null && value !== undefined) {
          const type = typeof value;
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
          }
          rendered += " " + name + '="' + value + '"';
        }
      }
    }
    return rendered;
  };
  var renderElements = (abstracts) => {
    let rendered = "";
    if (abstracts) {
      for (const abstract of abstracts) {
        if (abstract) {
          if (abstract.t) {
            rendered += "<" + abstract.t.toLocaleLowerCase() + renderAttributes(abstract.a);
            if (SELF_CLOSING.includes(abstract.t)) {
              rendered += "/>";
            } else {
              rendered += ">";
              if (abstract.c) {
                rendered += renderElements(abstract.c);
              }
              rendered += "</" + abstract.t.toLocaleLowerCase() + ">";
            }
          } else {
            rendered += " " + abstract + " ";
          }
        }
      }
    }
    return rendered;
  };
  var stringifyPatch = (abstractTree) => {
    abstractTree = arrayifyOrUndefined(abstractTree);
    return [
      renderElements(abstractTree),
      abstractTree
    ];
  };
  var stringify = (renderView, initialState) => {
    if (!initialState) {
      initialState = {};
    }
    const renderElements2 = (abstracts) => {
      let rendered = "";
      if (abstracts) {
        for (const abstract of abstracts) {
          if (abstract) {
            if (abstract.m) {
              rendered += renderElements2(arrayifyOrUndefined(abstract.r(initialState, abstract.m)));
            } else if (abstract.t) {
              rendered += "<" + abstract.t.toLocaleLowerCase() + renderAttributes(abstract.a);
              if (SELF_CLOSING.includes(abstract.t)) {
                rendered += "/>";
              } else {
                rendered += ">";
                if (abstract.c) {
                  rendered += renderElements2(abstract.c);
                }
                rendered += "</" + abstract.t.toLocaleLowerCase() + ">";
              }
            } else {
              rendered += " " + abstract + " ";
            }
          }
        }
      }
      return rendered;
    };
    const abstractTree = arrayifyOrUndefined(renderView(initialState));
    return [
      renderElements2(abstractTree),
      abstractTree
    ];
  };
  var customStringify = (data) => {
    if (typeof data === "number" || typeof data === "boolean") {
      return String(data);
    }
    if (typeof data === "string") {
      return '"' + data.replace(/"/g, "\\\"") + '"';
    }
    if (Array.isArray(data)) {
      return "[" + data.map((item) => customStringify(item)).join(",") + "]";
    }
    if (typeof data === "object") {
      const keys = Object.keys(data).filter((key) => !key.startsWith("_"));
      const objectContent = keys.map((key) => '"' + key + '":' + customStringify(data[key]) + '"').join(",");
      return "{" + objectContent + "}";
    }
    return "null";
  };
  var stringifyPatchFull = (abstracts) => {
    const [rendered, abstractTree] = stringifyPatch(abstracts);
    return [
      rendered,
      customStringify(abstractTree)
    ];
  };
  var stringifyFull = (renderView, initialState) => {
    if (!initialState) {
      initialState = {};
    }
    const [
      rendered,
      abstractTree
    ] = stringify(renderView, initialState);
    return [
      rendered,
      customStringify(abstractTree),
      JSON.stringify(initialState)
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
    nde,
    node,
    stringify,
    stringifyFull,
    stringifyPatch,
    stringifyPatchFull
  });
})();

//# debugId=1AF677BA406E459C64756E2164756E21
