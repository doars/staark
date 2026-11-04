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
  create
};
//# sourceMappingURL=vroagn.base.js.map
