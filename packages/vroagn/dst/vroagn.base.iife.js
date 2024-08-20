"use strict";
(() => {
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

  // src/index.base.iife.ts
  iife([
    "vroagn"
  ], {
    create
  });
})();
//# sourceMappingURL=vroagn.base.iife.js.map
