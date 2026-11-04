// src/library/parsers/record.js
var FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var validateKey = (key) => {
  if (typeof key !== "string" || FORBIDDEN_KEYS.has(key.trim())) {
    throw new TypeError(`Unsafe parser key: ${String(key)}`);
  }
  return key;
};
var createRecord = () => /* @__PURE__ */ Object.create(null);

// src/library/parsers/csv.js
var tsvTypes = ["tsv", "text/tab-separated-values"];
var csvParser = (options) => {
  return {
    types: options?.types || ["csv", "text/csv", ...tsvTypes],
    /**
     * Parse the response as CSV.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<any>} The parsed response.
     */
    parser: async (response, _requestOptions, type) => {
      const optionsTemp = {
        columnDelimiter: tsvTypes.includes(type) ? "	" : ",",
        rowDelimiter: "\n",
        escapeCharacter: '"',
        ...options
      };
      const string = await response.text();
      const rows = [];
      let currentRow = [];
      let currentField = "";
      let insideQuotes = false;
      let rowStart = 0;
      for (let i = 0; i < string.length; i++) {
        const character = string[i];
        const nextCharacter = string[i + 1];
        if (character === optionsTemp.escapeCharacter) {
          if (nextCharacter === optionsTemp.escapeCharacter && insideQuotes) {
            currentField += optionsTemp.escapeCharacter;
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (character === "\r" && nextCharacter === optionsTemp.rowDelimiter && !insideQuotes) {
        } else if (character === optionsTemp.columnDelimiter && !insideQuotes) {
          currentRow.push(currentField);
          currentField = "";
        } else if (character === optionsTemp.rowDelimiter && !insideQuotes) {
          currentRow.push(currentField);
          currentField = "";
          rows.push(currentRow);
          currentRow = [];
          rowStart = i + 1;
        } else {
          currentField += character;
        }
      }
      if (rowStart < string.length) {
        currentRow.push(currentField);
        rows.push(currentRow);
      }
      if (optionsTemp.hasHeaders) {
        const headers = rows[0];
        for (const header of headers) {
          validateKey(header);
        }
        return rows.slice(1).map((row) => {
          return headers.reduce((object, header, index) => {
            object[header] = row[index] || "";
            return object;
          }, createRecord());
        });
      }
      return rows;
    }
  };
};

// src/library/parsers/ini.js
var iniParser = (options = {}) => {
  return {
    types: options.types || ["ini"],
    /**
     * Parse the response as an INI object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<IniObject>} The parsed INI object.
     */
    parser: async (response, _requestOptions, _type) => {
      const text = await response.text();
      const result = createRecord();
      const lines = text.split(/\r?\n/).map((line) => line.trim());
      let currentSection = "";
      for (const line of lines) {
        if (line === "" || line.startsWith(";") || line.startsWith("#")) {
          continue;
        }
        if (line.startsWith("[") && line.endsWith("]")) {
          currentSection = line.slice(1, -1).trim();
          validateKey(currentSection);
          if (!Object.hasOwn(result, currentSection)) {
            result[currentSection] = createRecord();
          }
        } else {
          const [key, ...valueParts] = line.split("=");
          const value = valueParts.join("=").trim();
          const trimmedKey = key.trim();
          validateKey(trimmedKey);
          if (currentSection === "") {
            if (!Object.hasOwn(result, "global")) {
              result.global = createRecord();
            }
            result.global[trimmedKey] = value;
          } else {
            result[currentSection][trimmedKey] = value;
          }
        }
      }
      return result;
    }
  };
};

// src/library/parsers/toml.js
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
  if (!Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (value.match(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/
  )) {
    return new Date(value);
  }
  return value;
};
var parseTomlArray = (value) => {
  const values = [];
  let currentValue = "";
  let quote = null;
  for (const character of value) {
    if ((character === '"' || character === "'") && !quote) {
      quote = character;
      currentValue += character;
    } else if (character === quote) {
      quote = null;
      currentValue += character;
    } else if (character === "," && !quote) {
      if (currentValue.trim()) {
        values.push(parseTomlValue(currentValue.trim()));
      }
      currentValue = "";
    } else {
      currentValue += character;
    }
  }
  if (currentValue.trim()) {
    values.push(parseTomlValue(currentValue.trim()));
  }
  return values;
};
var parseInlineTable = (tableString) => {
  const result = createRecord();
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
      if (inValue) value += character;
    } else if (inQuotes && character === quoteChar) {
      inQuotes = false;
      if (inValue) value += character;
    } else if (!inQuotes && character === "=") {
      inValue = true;
    } else if (!inQuotes && character === ",") {
      const trimmedKey = key.trim();
      validateKey(trimmedKey);
      result[trimmedKey] = parseTomlValue(value.trim());
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
    const trimmedKey = key.trim();
    validateKey(trimmedKey);
    result[trimmedKey] = parseTomlValue(value.trim());
  }
  return result;
};
var tomlParser = (options = {}) => {
  return {
    types: options.types || ["toml", "application/toml"],
    /**
     * Parse the response as a TOML object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The options for the request.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<TomlObject>} The parsed TOML object.
     */
    parser: async (response, _requestOptions, _type) => {
      const text = await response.text();
      const result = createRecord();
      let currentTable = result;
      let multilineArray = null;
      let multilineArrayKey = null;
      let multilineString = null;
      let multilineStringKey = null;
      let multilineStringDelimiter = null;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (multilineString !== null) {
          const rawLine = lines[i].trimEnd();
          if (rawLine.endsWith(multilineStringDelimiter)) {
            multilineString += rawLine.slice(0, -3);
            currentTable[multilineStringKey] = multilineStringDelimiter === '"""' ? multilineString.replace(/\\\s*\n\s*/g, "") : multilineString;
            multilineString = null;
          } else {
            multilineString += `${rawLine}
`;
          }
          continue;
        }
        const line = lines[i].trim().replace(/^((?:"[^"]*"|'[^']*'|[^"'])*?)\s+#.*$/, "$1");
        if (line === "" || line.startsWith("#")) {
          continue;
        }
        if (multilineArray !== null) {
          multilineArray += ` ${line}`;
          if (line.endsWith("]")) {
            currentTable[multilineArrayKey] = parseTomlArray(
              multilineArray.slice(0, -1)
            );
            multilineArray = null;
            multilineArrayKey = null;
          }
          continue;
        }
        if (line.startsWith("[[") && line.endsWith("]]")) {
          const arrayName = line.slice(2, -2).trim();
          const parts = arrayName.split(".");
          let parent = result;
          for (let i2 = 0; i2 < parts.length - 1; i2++) {
            validateKey(parts[i2]);
            if (!Object.hasOwn(parent, parts[i2]))
              parent[parts[i2]] = createRecord();
            parent = parent[parts[i2]];
          }
          const lastPart = parts[parts.length - 1];
          validateKey(lastPart);
          if (!Object.hasOwn(parent, lastPart)) parent[lastPart] = [];
          const newTable = createRecord();
          parent[lastPart].push(newTable);
          currentTable = newTable;
          multilineArray = null;
          multilineArrayKey = null;
        } else if (line.startsWith("[") && line.endsWith("]")) {
          const tableName = line.slice(1, -1).trim();
          currentTable = result;
          const parts = tableName.split(".");
          for (const part of parts) {
            validateKey(part);
            if (!Object.hasOwn(currentTable, part))
              currentTable[part] = createRecord();
            currentTable = currentTable[part];
          }
          multilineArray = null;
          multilineArrayKey = null;
        } else {
          const [key, ...valueParts] = line.split("=");
          const value = valueParts.join("=").trim();
          const trimmedKey = key.trim();
          validateKey(trimmedKey);
          if (!value) {
            throw new SyntaxError(`Unsupported TOML on line ${i + 1}`);
          }
          if (value.startsWith('"""') || value.startsWith("'''")) {
            multilineStringDelimiter = value.slice(0, 3);
            multilineString = value.slice(3);
            if (value.length >= 6 && value.endsWith(multilineStringDelimiter)) {
              currentTable[trimmedKey] = multilineString.slice(0, -3);
              multilineString = null;
            } else {
              multilineStringKey = trimmedKey;
              if (multilineString) {
                multilineString += "\n";
              }
            }
          } else if (value.startsWith("{") && value.endsWith("}")) {
            currentTable[trimmedKey] = parseInlineTable(value);
          } else if (value.startsWith("[") && !value.endsWith("]")) {
            multilineArray = value.slice(1).trim();
            multilineArrayKey = trimmedKey;
          } else {
            if (value.startsWith("[") && value.endsWith("]")) {
              currentTable[trimmedKey] = parseTomlArray(value.slice(1, -1));
            } else {
              currentTable[trimmedKey] = parseTomlValue(value);
            }
          }
        }
      }
      return result;
    }
  };
};

// src/library/parsers/yaml.js
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
  if (value && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1).trim();
    return value ? value.split(",").map((item) => parseValue(item.trim(), anchors)) : [];
  }
  if (value.startsWith("*")) {
    const anchorName = value.slice(1).trim();
    return anchors[anchorName];
  }
  if (value.includes("!!")) {
    const [tag, tagValue] = value.split(" ");
    switch (tag) {
      case "!!int":
        return parseInt(tagValue, 10);
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
    /**
     * Parse the response as a YAML object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<YamlObject>} The parsed YAML object.
     */
    parser: async (response, _requestOptions, _type) => {
      const lines = (await response.text()).replace(/\r?\n$/, "").split("\n");
      lines.push("#");
      const result = createRecord();
      const anchors = createRecord();
      const stack = [{ indent: -1, object: result }];
      let block = null;
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trimEnd();
        let indent = line.search(/\S/);
        if (block) {
          if (indent < 0 || indent > block.indent) {
            block.lines.push(line);
            continue;
          }
          const blockIndent = Math.max(
            (block.lines.find((blockLine) => blockLine) || "").search(/\S/),
            0
          );
          let text2 = block.lines.map((blockLine) => blockLine.slice(blockIndent)).join("\n");
          if (block.style[0] === ">") {
            text2 = text2.replace(/\n(\n*)(?=.)/g, (_, extra) => extra || " ");
          }
          block.object[block.key] = block.style[1] === "+" ? `${text2}
` : text2.replace(/\n*$/, block.style[1] === "-" ? "" : "\n");
          block = null;
        }
        line = line.replace(/^((?:"[^"]*"|'[^']*'|[^"'])*?)\s+#.*$/, "$1");
        if (indent < 0 || line[indent] === "#" || line === "---") {
          continue;
        }
        let text = line.slice(indent);
        let top = stack[stack.length - 1];
        if (text === "-" || text.startsWith("- ")) {
          while (top.indent > indent || top.indent === indent && top.item) {
            stack.pop();
            top = stack[stack.length - 1];
          }
          if (!Array.isArray(top.object)) {
            if (!top.owner) {
              throw new SyntaxError(`Unsupported YAML on line ${i + 1}`);
            }
            top.object = top.owner[top.key] = [];
            if (top.anchor) {
              anchors[top.anchor] = top.object;
            }
          }
          const rest = text.slice(1).trim();
          if (rest && !/^[^"'[{]*?:( |$)/.test(rest)) {
            top.object.push(parseValue(rest, anchors));
            continue;
          }
          const item = createRecord();
          top.object.push(item);
          stack.push({ indent, item: true, object: item });
          if (!rest) {
            continue;
          }
          indent = line.indexOf(rest, indent + 1);
          text = rest;
        }
        while (stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        const object = stack[stack.length - 1].object;
        const colonIndex = text.indexOf(":");
        if (colonIndex < 1 || Array.isArray(object)) {
          throw new SyntaxError(`Unsupported YAML on line ${i + 1}`);
        }
        const key = validateKey(text.slice(0, colonIndex).trim());
        let value = text.slice(colonIndex + 1).trim();
        let anchorName;
        if (value.startsWith("&")) {
          anchorName = value.slice(1).split(" ")[0];
          value = value.slice(anchorName.length + 2).trim();
        }
        if (/^[|>][+-]?$/.test(value)) {
          block = { indent, key, lines: [], object, style: value };
        } else if (key === "<<") {
          for (const record of [].concat(parseValue(value, anchors))) {
            for (const recordKey in record) {
              if (!(recordKey in object)) {
                object[recordKey] = record[recordKey];
              }
            }
          }
        } else if (value) {
          object[key] = parseValue(value, anchors);
        } else {
          object[key] = createRecord();
          stack.push({
            anchor: anchorName,
            indent,
            key,
            object: object[key],
            owner: object
          });
        }
        if (anchorName) {
          anchors[anchorName] = object[key];
        }
      }
      return result;
    }
  };
};

// src/utilities/clone.js
var cloneRecursive = (value, clones = /* @__PURE__ */ new WeakMap()) => {
  if (!value || typeof value !== "object") {
    return value;
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  if (clones.has(value)) {
    return clones.get(value);
  }
  const clone = Array.isArray(value) ? [] : Object.create(prototype);
  clones.set(value, clone);
  for (const key of Object.keys(value)) {
    clone[key] = cloneRecursive(value[key], clones);
  }
  return clone;
};

// src/utilities/delay.js
var delay = (time, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(signal.reason);
    return;
  }
  if (!(time > 0)) {
    resolve(null);
    return;
  }
  const onAbort = () => {
    clearTimeout(timeoutIdentifier);
    reject(signal.reason);
  };
  const timeoutIdentifier = setTimeout(() => {
    signal?.removeEventListener("abort", onAbort);
    resolve(null);
  }, time);
  signal?.addEventListener("abort", onAbort, { once: true });
});

// src/utilities/type.js
var normalizeContentType = (contentType) => contentType.split(";")[0].trim().toLowerCase();
var getType = (url, responseHeaders, requestHeaders) => {
  const contentType = responseHeaders.get("Content-Type");
  if (contentType) {
    return normalizeContentType(contentType);
  }
  const accept = requestHeaders.get("Accept");
  if (accept) {
    for (const type of accept.split(",")) {
      if (type.trim() !== "*/*") {
        return normalizeContentType(type);
      }
    }
  }
  const match = url.match(/\.([^./?#]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : "";
};

// src/library/request.js
var DEFAULT_VALUES = {
  method: "get",
  retryCodes: [429, 503, 504],
  retryDelay: 500
};
var create = (initialOptions) => {
  const validateTrustedHTMLOptions = (options) => {
    if (Object.hasOwn(options, "createTrustedHTML") && typeof options.createTrustedHTML !== "function") {
      throw new TypeError("createTrustedHTML must be a function");
    }
    if (Object.hasOwn(options, "trustedTypesPolicy") && (typeof options.trustedTypesPolicy !== "object" || options.trustedTypesPolicy === null || typeof options.trustedTypesPolicy.createHTML !== "function")) {
      throw new TypeError("trustedTypesPolicy.createHTML must be a function");
    }
  };
  validateTrustedHTMLOptions(initialOptions);
  initialOptions = {
    ...DEFAULT_VALUES,
    ...cloneRecursive(initialOptions)
  };
  let lastExecutionTime = 0;
  let activeRequests = 0;
  let totalRequests = 0;
  let debounceTimeout = null;
  const debounceResolvers = [];
  const concurrencyQueue = [];
  if (initialOptions.maxConcurrency !== void 0 && (!Number.isInteger(initialOptions.maxConcurrency) || initialOptions.maxConcurrency <= 0)) {
    throw new TypeError("maxConcurrency must be a positive integer");
  }
  const drainConcurrencyQueue = () => {
    while (concurrencyQueue.length > 0) {
      const queued = concurrencyQueue[0];
      if (activeRequests >= queued.maximum) {
        return;
      }
      concurrencyQueue.shift();
      queued.signal?.removeEventListener("abort", queued.abort);
      if (queued.signal?.aborted) {
        queued.reject(queued.signal.reason);
        continue;
      }
      activeRequests++;
      queued.resolve();
    }
  };
  const acquireConcurrency = (maximum, signal) => new Promise((resolve, reject) => {
    const queued = {
      maximum,
      reject,
      resolve,
      signal
    };
    const abort = () => {
      const index = concurrencyQueue.indexOf(queued);
      if (index >= 0) {
        concurrencyQueue.splice(index, 1);
        reject(
          signal.reason || new DOMException("Request aborted", "AbortError")
        );
        drainConcurrencyQueue();
      }
    };
    queued.abort = abort;
    concurrencyQueue.push(queued);
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    drainConcurrencyQueue();
  });
  const sendRequest = async (options) => {
    if (options.maxRequests !== void 0 && totalRequests >= options.maxRequests) {
      return [new Error("Maximum request limit reached"), null, null];
    }
    totalRequests++;
    const config = {
      cache: options.cache,
      credentials: options.credentials,
      headers: options.headers,
      method: options.method,
      mode: options.mode,
      priority: options.priority,
      redirect: options.redirect,
      body: options.body || void 0
    };
    const bodyPrototype = config.body && Object.getPrototypeOf(config.body);
    if (Array.isArray(config.body) || bodyPrototype === Object.prototype || bodyPrototype === null) {
      config.body = JSON.stringify(config.body);
      if (!config.headers.has("Content-Type")) {
        config.headers.set("Content-Type", "application/json");
      }
    }
    let url = (options.domain || "") + (options.path || "");
    const query = new URLSearchParams(options.queryParams).toString();
    if (query) {
      url = url.replace(
        /^[^#]*/,
        (base) => base + (base.includes("?") ? "&" : "?") + query
      );
    }
    const externalSignal = options.abort?.signal || options.abort;
    const controller = new AbortController();
    const abortFromExternal = () => controller.abort(externalSignal.reason);
    if (externalSignal?.aborted) {
      abortFromExternal();
    } else {
      externalSignal?.addEventListener("abort", abortFromExternal, {
        once: true
      });
    }
    config.signal = controller.signal;
    const timeoutIdentifier = options.timeout ? setTimeout(
      () => controller.abort(
        new DOMException("Request timed out", "TimeoutError")
      ),
      options.timeout
    ) : null;
    const executeFetch = async () => {
      let response;
      try {
        response = await (options.fetch ?? fetch)(url, config);
      } catch (error) {
        return [
          error instanceof Error ? error : new Error("Unknown fetch error"),
          null,
          null
        ];
      }
      if (!response.ok) {
        const error = new Error(
          response.statusText || `Request failed with status ${response.status}`
        );
        return [
          Object.assign(error, { response, status: response.status }),
          response,
          null
        ];
      }
      try {
        let result;
        let foundParser = false;
        const type = options.type || getType(url, response.headers, options.headers);
        if (options.parsers) {
          for (const parser of options.parsers) {
            foundParser = parser.types.includes(type);
            if (foundParser) {
              result = await parser.parser(response, options, type);
              break;
            }
          }
        }
        if (!foundParser) {
          const createTrustedHTML = options.createTrustedHTML || options.trustedTypesPolicy?.createHTML.bind(
            options.trustedTypesPolicy
          );
          switch (type.toLowerCase()) {
            case "arraybuffer":
              result = await response.arrayBuffer();
              break;
            case "blob":
              result = await response.blob();
              break;
            case "formdata":
              result = await response.formData();
              break;
            case "text/plain":
            case "text":
            case "txt":
              result = await response.text();
              break;
            case "text/html-partial":
            case "html-partial":
            case "text/html":
            case "html": {
              const responseText = await response.text();
              result = createTrustedHTML ? createTrustedHTML(responseText) : responseText;
              try {
                if (type.toLowerCase().endsWith("partial")) {
                  const template = document.createElement("template");
                  template.innerHTML = result;
                  result = template.content.childNodes;
                } else {
                  result = new DOMParser().parseFromString(result, "text/html");
                }
              } catch (error) {
                if (!createTrustedHTML) {
                  throw new Error(
                    "HTML parsing requires createTrustedHTML or trustedTypesPolicy",
                    { cause: error }
                  );
                }
                throw error;
              }
              break;
            }
            case "application/json":
            case "text/json":
            case "json":
              result = await response.json();
              break;
            case "image/svg+xml":
            case "svg":
              result = await response.text();
              result = new DOMParser().parseFromString(result, "image/svg+xml");
              break;
            case "application/xml":
            case "text/xml":
            case "xml":
              result = await response.text();
              result = new DOMParser().parseFromString(
                result,
                "application/xml"
              );
              break;
          }
        }
        return [null, response, result];
      } catch (error) {
        return [
          error || new Error("Thrown parsing error is falsy"),
          response,
          null
        ];
      }
    };
    try {
      for (let attempt = 0; ; attempt++) {
        const [error, response, result] = await executeFetch();
        if (!error || controller.signal.aborted || response?.ok || response && !options.retryCodes?.includes(response.status) || attempt >= (options.retryAttempts || 0)) {
          return [error, response, result];
        }
        let delayTime = (options.retryDelay || 0) * 2 ** attempt;
        const retryAfter = response?.headers.get("Retry-After");
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!Number.isNaN(retryAfterSeconds)) {
            delayTime = Math.max(delayTime, retryAfterSeconds * 1e3);
          } else {
            const retryAfterDate = new Date(retryAfter).getTime();
            if (!Number.isNaN(retryAfterDate)) {
              const currentTime = Date.now();
              delayTime = Math.max(delayTime, retryAfterDate - currentTime);
            }
          }
        }
        if (options.maximumRetryDelay !== void 0) {
          delayTime = Math.min(delayTime, options.maximumRetryDelay);
        }
        await response?.body?.cancel();
        await delay(delayTime, controller.signal);
      }
    } finally {
      if (timeoutIdentifier !== null) {
        clearTimeout(timeoutIdentifier);
      }
      externalSignal?.removeEventListener("abort", abortFromExternal);
    }
  };
  const executeScheduled = async (options) => {
    const maximum = options.maxConcurrency ?? Infinity;
    if (maximum !== Infinity && (!Number.isInteger(maximum) || maximum <= 0)) {
      return [
        new TypeError("maxConcurrency must be a positive integer"),
        null,
        null
      ];
    }
    const signal = options.abort?.signal || options.abort;
    let acquired = false;
    try {
      await delay(options.delay, signal);
      if (options.throttle) {
        const now = Date.now();
        const waitTime = options.throttle - (now - lastExecutionTime);
        lastExecutionTime = now + Math.max(waitTime, 0);
        await delay(waitTime, signal);
      }
      await acquireConcurrency(maximum, signal);
      acquired = true;
      return await sendRequest(options);
    } catch (error) {
      return [
        error instanceof Error ? error : new Error("Unknown request error"),
        null,
        null
      ];
    } finally {
      if (acquired) {
        activeRequests--;
        drainConcurrencyQueue();
      }
    }
  };
  return (sendOptions = {}) => {
    const { body, ...otherOptions } = sendOptions;
    const options = {
      ...initialOptions,
      ...cloneRecursive(otherOptions)
    };
    if (Object.hasOwn(sendOptions, "body")) {
      options.body = body;
    }
    try {
      validateTrustedHTMLOptions(sendOptions);
      options.headers = new Headers(initialOptions.headers);
      for (const [key, value] of new Headers(sendOptions.headers)) {
        options.headers.set(key, value);
      }
    } catch (error) {
      return Promise.resolve([error, null, null]);
    }
    if (Object.hasOwn(sendOptions, "trustedTypesPolicy") && !Object.hasOwn(sendOptions, "createTrustedHTML")) {
      options.createTrustedHTML = void 0;
    }
    if (!options.debounce) {
      return executeScheduled(options);
    }
    return new Promise((resolve) => {
      const signal = options.abort?.signal || options.abort;
      const pending = {
        options,
        resolve,
        signal
      };
      const abort = () => {
        const index = debounceResolvers.indexOf(pending);
        if (index >= 0) {
          debounceResolvers.splice(index, 1);
          resolve([
            signal.reason || new DOMException("Request aborted", "AbortError"),
            null,
            null
          ]);
        }
      };
      pending.abort = abort;
      debounceResolvers.push(pending);
      if (signal?.aborted) {
        abort();
      } else {
        signal?.addEventListener("abort", abort, { once: true });
      }
      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(async () => {
        const pendingResolvers = debounceResolvers.splice(0);
        debounceTimeout = null;
        if (pendingResolvers.length === 0) {
          return;
        }
        const result = await executeScheduled(pendingResolvers.at(-1).options);
        for (const pendingResolver of pendingResolvers) {
          pendingResolver.signal?.removeEventListener(
            "abort",
            pendingResolver.abort
          );
          pendingResolver.resolve(result);
        }
      }, options.debounce);
    });
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
