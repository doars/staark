var __defProp = Object.defineProperty;
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
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/utilities/clone.ts
var cloneRecursive = (value) => {
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const clone = [];
      for (let i = 0; i < value.length; i++) {
        clone.push(cloneRecursive(value[i]));
      }
      value = clone;
    } else {
      const clone = {};
      for (const key in value) {
        clone[key] = cloneRecursive(value[key]);
      }
      value = clone;
    }
  }
  return value;
};

// src/utilities/delay.ts
var delay = (time) => __async(void 0, null, function* () {
  if (time > 0) {
    return new Promise(
      (resolve) => setTimeout(resolve, time)
    );
  }
  return null;
});

// src/utilities/type.ts
var normalizeContentType = (contentType) => contentType.split(";")[0].trim().toLowerCase();
var getFileExtension = (url) => {
  const match = url.match(/\.([^./?]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : null;
};
var getType = function(url, responseHeaders, requestHeaders) {
  const contentType = responseHeaders.get("Content-Type");
  if (contentType) {
    return normalizeContentType(contentType);
  }
  if (requestHeaders) {
    if (requestHeaders["Accept"]) {
      const acceptTypes = requestHeaders["Accept"].split(",");
      for (const type of acceptTypes) {
        if (type.trim() !== "*/*") {
          return normalizeContentType(type);
        }
      }
    }
  }
  const extension = getFileExtension(url);
  if (extension) {
    return extension;
  }
  return "";
};

// src/library/request.ts
var DEFAULT_VALUES = {
  method: "get",
  retryCodes: [429, 503, 504],
  retryDelay: 500
};
var create = (initialOptions) => {
  initialOptions = __spreadValues(__spreadValues({}, DEFAULT_VALUES), cloneRecursive(initialOptions));
  let lastExecutionTime = 0;
  let activeRequests = 0;
  let totalRequests = 0;
  let debounceTimeout = null;
  const throttle = (throttleValue) => __async(void 0, null, function* () {
    const now = Date.now();
    const waitTime = throttleValue - (now - lastExecutionTime);
    lastExecutionTime = now + (waitTime > 0 ? waitTime : 0);
    yield delay(waitTime);
  });
  const debounce = (debounceValue) => {
    return new Promise((resolve) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(
        resolve,
        debounceValue
      );
    });
  };
  const sendRequest = (options) => __async(void 0, null, function* () {
    const config = {
      cache: options.cache,
      credentials: options.credentials,
      headers: options.headers,
      method: options.method,
      mode: options.mode,
      redirect: options.redirect,
      body: options.body ? JSON.stringify(options.body) : void 0
    };
    let url = (options.domain || "") + (options.path || "");
    if (options.queryParams) {
      url += "?" + new URLSearchParams(
        options.queryParams
      ).toString();
    }
    if (options.timeout) {
      const controller = options.abort || new AbortController();
      config.signal = controller.signal;
      setTimeout(
        () => controller.abort(),
        options.timeout
      );
    }
    const executeFetch = () => __async(void 0, null, function* () {
      const response = yield fetch(
        url,
        config
      );
      let result;
      let foundParser = false;
      const type = options.type || getType(url, response.headers, options.headers);
      if (options.responseParsers) {
        for (const parser of options.responseParsers) {
          foundParser = parser.types.includes(type);
          if (foundParser) {
            result = yield parser.parser(
              response,
              options
            );
            break;
          }
        }
      }
      if (!foundParser) {
        switch (type.toLowerCase()) {
          case "arraybuffer":
            result = yield response.arrayBuffer();
            break;
          case "blob":
            result = yield response.blob();
            break;
          case "formdata":
            result = yield response.formData();
            break;
          case "text/plain":
          case "text":
          case "txt":
            result = yield response.text();
            break;
          case "text/html-partial":
          case "html-partial":
            result = yield response.text();
            const template = document.createElement("template");
            template.innerHTML = result;
            result = template.content.childNodes[0];
            break;
          case "text/html":
          case "html":
            result = yield response.text();
            result = new DOMParser().parseFromString(result, "text/html");
            break;
          case "application/json":
          case "text/json":
          case "json":
            result = yield response.json();
            break;
          case "image/svg+xml":
          case "svg":
            result = yield response.text();
            result = new DOMParser().parseFromString(result, "image/svg+xml");
            break;
          case "application/xml":
          case "text/xml":
          case "xml":
            result = yield response.text();
            result = new DOMParser().parseFromString(result, "application/xml");
            break;
        }
      }
      return [response, result];
    });
    const retryRequest = () => __async(void 0, null, function* () {
      let attempt = 0;
      const retryAttempts = options.retryAttempts || 0;
      const retryDelay = options.retryDelay || 0;
      while (attempt < retryAttempts) {
        try {
          return yield executeFetch();
        } catch (error) {
          attempt++;
          if (attempt >= retryAttempts) {
            throw error;
          }
          yield delay(retryDelay * Math.pow(2, attempt - 1));
        }
      }
      return executeFetch();
    });
    try {
      const [response, result] = yield retryRequest();
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return [response, result];
    } catch (error) {
      throw error;
    }
  });
  return (sendOptions) => __async(void 0, null, function* () {
    const options = __spreadValues(__spreadValues({}, initialOptions), cloneRecursive(sendOptions));
    if (initialOptions.headers) {
      options.headers = __spreadValues(__spreadValues({}, initialOptions.headers), options.headers);
    }
    if (options.debounce) {
      yield debounce(options.debounce);
    }
    if (options.delay) {
      yield delay(options.delay);
    }
    if (options.throttle) {
      yield throttle(options.throttle);
    }
    if (options.maxConcurrency && activeRequests >= options.maxConcurrency) {
      yield new Promise((resolve) => {
        let interval = null;
        const wait = () => {
          if (activeRequests >= options.maxConcurrency) {
            interval = requestAnimationFrame(wait);
          } else {
            if (interval) {
              clearInterval(interval);
            }
            resolve(null);
          }
        };
        interval = requestAnimationFrame(wait);
      });
    }
    activeRequests++;
    try {
      return yield sendRequest(
        options
      );
    } finally {
      activeRequests--;
    }
  });
};

// src/library/parsers/csv.ts
var csvParser = (options) => {
  options = __spreadValues({
    columnDelimiter: ",",
    rowDelimiter: "\n",
    escapeCharacter: '"'
  }, options);
  return {
    types: options.types || ["csv", "text/csv"],
    parser: (response, requestOptions) => __async(void 0, null, function* () {
      const string = yield response.text();
      const rows = [];
      let currentRow = [];
      let currentField = "";
      let insideQuotes = false;
      for (let i = 0; i < string.length; i++) {
        const character = string[i];
        const nextCharacter = string[i + 1];
        if (character === options.escapeCharacter) {
          if (nextCharacter === options.escapeCharacter && insideQuotes) {
            currentField += options.escapeCharacter;
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (character === options.columnDelimiter && !insideQuotes) {
          currentRow.push(
            currentField
          );
          currentField = "";
        } else if (character === options.rowDelimiter && !insideQuotes) {
          currentRow.push(
            currentField
          );
          currentField = "";
          rows.push(currentRow);
          currentRow = [];
        } else {
          currentField += character;
        }
      }
      if (currentField) {
        currentRow.push(
          currentField
        );
        currentField = "";
      }
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      if (options.hasHeaders) {
        const headers = rows[0];
        return rows.slice(1).map((row) => {
          return headers.reduce((obj, header, index) => {
            obj[header] = row[index] || "";
            return obj;
          }, {});
        });
      }
      return rows;
    })
  };
};

// src/library/parsers/ini.ts
var iniParser = (options = {}) => {
  return {
    types: options.types || ["ini"],
    parser: (response, requestOptions) => __async(void 0, null, function* () {
      const text = yield response.text();
      const result = {};
      const lines = text.split(/\r?\n/).map((line) => line.trim());
      let currentSection = "";
      for (const line of lines) {
        if (line === "" || line.startsWith(";") || line.startsWith("#")) {
          continue;
        }
        if (line.startsWith("[") && line.endsWith("]")) {
          currentSection = line.slice(1, -1).trim();
          if (!result[currentSection]) {
            result[currentSection] = {};
          }
        } else {
          const [key, ...valueParts] = line.split("=");
          const value = valueParts.join("=").trim();
          if (currentSection === "") {
            if (!result["global"]) {
              result["global"] = {};
            }
            result["global"][key.trim()] = value;
          } else {
            result[currentSection][key.trim()] = value;
          }
        }
      }
      return result;
    })
  };
};

// src/library/parsers/toml.ts
var parseTomlValue = (value) => {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value === "true" || value === "false") {
    return value === "true";
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/)) {
    return new Date(value);
  }
  return value;
};
var parseInlineTable = (tableString) => {
  const result = {};
  let key = "";
  let value = "";
  let inQuotes = false;
  let quoteChar = "";
  let inValue = false;
  for (let i = 1; i < tableString.length - 1; i++) {
    const character = tableString[i];
    if (!inQuotes && (character === '"' || character === "'")) {
      inQuotes = true;
      quoteChar = character;
    } else if (inQuotes && character === quoteChar) {
      inQuotes = false;
    } else if (!inQuotes && character === "=") {
      inValue = true;
    } else if (!inQuotes && character === ",") {
      result[key.trim()] = parseTomlValue(value.trim());
      key = "";
      value = "";
      inValue = false;
    } else {
      if (inValue) {
        value += character;
      } else {
        key += character;
      }
    }
  }
  if (key) {
    result[key.trim()] = parseTomlValue(value.trim());
  }
  return result;
};
var tomlParser = (options = {}) => {
  return {
    types: options.types || ["toml", "application/toml"],
    parser: (response, requestOptions) => __async(void 0, null, function* () {
      const text = yield response.text();
      const result = {};
      let currentTable = result;
      let currentArray = null;
      let multilineString = null;
      let multilineStringDelimiter = null;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === "" || line.startsWith("#")) {
          continue;
        }
        if (multilineString !== null) {
          if (line.endsWith(multilineStringDelimiter)) {
            multilineString += line.slice(0, -multilineStringDelimiter.length);
            currentTable[Object.keys(currentTable).pop()] = multilineString;
            multilineString = null;
            multilineStringDelimiter = null;
          } else {
            multilineString += line + "\n";
          }
          continue;
        }
        if (line.startsWith("[") && line.endsWith("]")) {
          const tableName = line.slice(1, -1).trim();
          currentTable = result;
          const parts = tableName.split(".");
          for (const part of parts) {
            if (!currentTable[part]) currentTable[part] = {};
            currentTable = currentTable[part];
          }
          currentArray = null;
        } else if (line.startsWith("[[") && line.endsWith("]]")) {
          const arrayName = line.slice(2, -2).trim();
          const parts = arrayName.split(".");
          let parent = result;
          for (let i2 = 0; i2 < parts.length - 1; i2++) {
            if (!parent[parts[i2]]) parent[parts[i2]] = {};
            parent = parent[parts[i2]];
          }
          const lastPart = parts[parts.length - 1];
          if (!parent[lastPart]) parent[lastPart] = [];
          const newTable = {};
          parent[lastPart].push(newTable);
          currentTable = newTable;
          currentArray = null;
        } else {
          const [key, ...valueParts] = line.split("=");
          let value = valueParts.join("=").trim();
          if (value.startsWith('"""') || value.startsWith("'''")) {
            multilineStringDelimiter = value.slice(0, 3);
            multilineString = value.slice(3);
            if (value.endsWith(multilineStringDelimiter)) {
              currentTable[key.trim()] = multilineString.slice(0, -3);
              multilineString = null;
              multilineStringDelimiter = null;
            }
          } else if (value.startsWith("{") && value.endsWith("}")) {
            currentTable[key.trim()] = parseInlineTable(value);
          } else if (value.startsWith("[") && !value.endsWith("]")) {
            currentArray = [];
            value = value.slice(1).trim();
          } else {
            if (currentArray !== null) {
              if (value.endsWith("]")) {
                currentArray.push(parseTomlValue(value.slice(0, -1).trim()));
                currentTable[key.trim()] = currentArray;
                currentArray = null;
              } else {
                currentArray.push(parseTomlValue(value));
              }
            } else {
              currentTable[key.trim()] = parseTomlValue(value);
            }
          }
        }
      }
      return result;
    })
  };
};

// src/library/parsers/yaml.ts
var parseValue = (value, anchors) => {
  if (value === "null" || value === "~") {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map(
      (item) => parseValue(item.trim(), anchors)
    );
  }
  if (value.startsWith("*")) {
    const anchorName = value.slice(1).trim();
    return anchors[anchorName];
  }
  if (value.includes("!!")) {
    const [tag, tagValue] = value.split(" ");
    switch (tag) {
      case "!!int":
        return parseInt(tagValue);
      case "!!float":
        return parseFloat(tagValue);
      case "!!str":
        return tagValue;
      case "!!bool":
        return tagValue.toLowerCase() === "true";
      default:
        return tagValue;
    }
  }
  return value;
};
var yamlParser = (options = {}) => {
  return {
    types: options.types || ["yaml", "application/yaml", "text/yaml"],
    parser: (response, requestOptions) => __async(void 0, null, function* () {
      const lines = (yield response.text()).split("\n");
      const result = {};
      let currentObject = result;
      let indentStack = [result];
      let currentIndent = 0;
      let multilineKey = null;
      let multilineValue = [];
      const anchors = {};
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trimEnd();
        if (line.trim().startsWith("#")) {
          continue;
        }
        const indent = line.search(/\S/);
        if (multilineKey !== null) {
          if (indent > currentIndent) {
            multilineValue.push(line.trim());
            continue;
          } else {
            currentObject[multilineKey] = multilineValue.join("\n");
            multilineKey = null;
            multilineValue = [];
          }
        }
        if (indent > currentIndent) {
          indentStack.push(currentObject);
          currentObject = currentObject[Object.keys(currentObject).pop()];
        } else if (indent < currentIndent) {
          while (indent < currentIndent) {
            indentStack.pop();
            currentObject = indentStack[indentStack.length - 1];
            currentIndent -= options.indentSize || 2;
          }
        }
        currentIndent = indent;
        if (line.trim() === "-") {
          if (!Array.isArray(currentObject)) {
            const lastKey = Object.keys(currentObject).pop();
            currentObject[lastKey] = [];
            currentObject = currentObject[lastKey];
          }
          currentObject.push({});
          currentObject = currentObject[currentObject.length - 1];
          continue;
        }
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) {
          continue;
        }
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        if (value.startsWith("&")) {
          const anchorName = value.slice(1).split(" ")[0];
          value = value.slice(anchorName.length + 2).trim();
          const parsedValue = parseValue(value, anchors);
          anchors[anchorName] = parsedValue;
          currentObject[key] = parsedValue;
        } else if (value.startsWith("*")) {
          const anchorName = value.slice(1).trim();
          currentObject[key] = anchors[anchorName];
        } else if (value === "|" || value === ">") {
          multilineKey = key;
          currentIndent += options.indentSize || 2;
        } else if (value) {
          currentObject[key] = parseValue(value, anchors);
        } else {
          currentObject[key] = {};
        }
      }
      return result;
    })
  };
};
export {
  create,
  csvParser,
  iniParser,
  tomlParser,
  yamlParser
};
//# sourceMappingURL=vroagn.js.map
