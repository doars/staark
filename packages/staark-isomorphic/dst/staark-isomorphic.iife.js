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

  // src/library/factory.ts
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
  var tokenizer = (selector) => {
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

  // src/library/fctory.ts
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
          const [_, _attributes] = tokenizer(selector);
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

  // src/library/nde.ts
  var nde = (selector, contents) => {
    const [type, attributes] = tokenizer(selector);
    return {
      _: marker,
      a: attributes,
      c: Array.isArray(contents) ? contents : [contents],
      t: type.toUpperCase()
    };
  };

  // ../staark-common/src/array.ts
  var arrayify = function(data) {
    if (Array.isArray(data)) {
      return data;
    }
    return [
      data
    ];
  };

  // src/library/stringify.ts
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
  var renderAttributes = (attributes = null) => {
    let rendered = "";
    if (attributes) {
      for (const name in attributes) {
        let value = attributes[name];
        if (value !== null) {
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
  var renderElements = (abstracts = null) => {
    let rendered = "";
    if (abstracts) {
      for (const abstract of abstracts) {
        if (abstract.t) {
          rendered += "<" + abstract.t + renderAttributes(abstract.a);
          if (SELF_CLOSING.includes(abstract.t)) {
            rendered += "/>";
          } else {
            rendered += ">";
            if (abstract.c) {
              rendered += renderElements(abstract.c);
            }
            rendered += "<" + abstract.t + ">";
          }
        } else {
          rendered += " " + (abstract.c ? abstract.c : abstract) + " ";
        }
      }
    }
    return rendered;
  };
  var stringify = (renderView, initialState) => {
    if (!initialState) {
      initialState = {};
    }
    const abstractTree = arrayify(
      renderView(initialState)
    );
    return [
      renderElements(
        abstractTree
      ),
      abstractTree
    ];
  };

  // src/library/text.ts
  var text = (contents) => ({
    _: marker,
    c: Array.isArray(contents) ? contents.join("") : "" + contents
  });

  // src/index.iife.ts
  iife([
    "staark"
  ], {
    factory,
    fctory,
    nde,
    node,
    stringify,
    text
  });
})();
//# sourceMappingURL=staark-isomorphic.iife.js.map
