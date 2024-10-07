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
        var _a;
        const response2 = yield ((_a = options.fetch) != null ? _a : fetch)(url, config);
        if (!response2.ok) {
          return [new Error("Invalid response"), response2, null];
        }
        try {
          let result2;
          let foundParser = false;
          const type = options.type || getType(url, response2.headers, options.headers);
          if (options.parsers) {
            for (const parser of options.parsers) {
              foundParser = parser.types.includes(type);
              if (foundParser) {
                result2 = yield parser.parser(
                  response2,
                  options,
                  type
                );
                break;
              }
            }
          }
          if (!foundParser) {
            switch (type.toLowerCase()) {
              case "arraybuffer":
                result2 = yield response2.arrayBuffer();
                break;
              case "blob":
                result2 = yield response2.blob();
                break;
              case "formdata":
                result2 = yield response2.formData();
                break;
              case "text/plain":
              case "text":
              case "txt":
                result2 = yield response2.text();
                break;
              case "text/html-partial":
              case "html-partial":
                result2 = yield response2.text();
                const template = document.createElement("template");
                template.innerHTML = result2;
                result2 = template.content.childNodes;
                break;
              case "text/html":
              case "html":
                result2 = yield response2.text();
                result2 = new DOMParser().parseFromString(result2, "text/html");
                break;
              case "application/json":
              case "text/json":
              case "json":
                result2 = yield response2.json();
                break;
              case "image/svg+xml":
              case "svg":
                result2 = yield response2.text();
                result2 = new DOMParser().parseFromString(result2, "image/svg+xml");
                break;
              case "application/xml":
              case "text/xml":
              case "xml":
                result2 = yield response2.text();
                result2 = new DOMParser().parseFromString(result2, "application/xml");
                break;
            }
          }
          return [null, response2, result2];
        } catch (error2) {
          return [error2 || new Error("Thrown parsing error is falsy"), response2, null];
        }
      });
      const retryRequest = () => __async(void 0, null, function* () {
        var _a;
        let attempt = 0;
        const retryAttempts = options.retryAttempts || 0;
        const retryDelay = options.retryDelay || 0;
        while (attempt < retryAttempts) {
          const [error2, response2, result2] = yield executeFetch();
          if (!error2) {
            return [error2, response2, result2];
          }
          if (!((_a = options.retryCodes) == null ? void 0 : _a.includes(response2.status || 200))) {
            return [new Error("Invalid status code"), response2, result2];
          }
          attempt++;
          if (attempt >= retryAttempts) {
            return [new Error("Too many retry attempts"), response2, result2];
          }
          let delayTime = retryDelay * Math.pow(2, attempt - 1);
          const retryAfter = response2.headers.get("Retry-After");
          if (retryAfter) {
            const retryAfterSeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryAfterSeconds)) {
              delayTime = Math.max(delayTime, retryAfterSeconds * 1e3);
            } else {
              const retryAfterDate = new Date(retryAfter).getTime();
              if (!isNaN(retryAfterDate)) {
                const currentTime = Date.now();
                delayTime = Math.max(delayTime, retryAfterDate - currentTime);
              }
            }
          }
          yield delay(delayTime);
        }
        return executeFetch();
      });
      const [error, response, result] = yield retryRequest();
      if (!response.ok) {
        return [new Error(response.statusText), response, result];
      }
      return [error, response, result];
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
      const results = yield sendRequest(
        options
      );
      activeRequests--;
      return results;
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
