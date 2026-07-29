(() => {
  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof subject[path[i]] !== "object" || !Array.isArray(subject[path[i]])) {
        subject[path[i]] = {};
      }
      subject = subject[path[i]];
    }
    subject[path[path.length - 1]] = data;
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
  var delay = async (time) => {
    if (time > 0) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
    return null;
  };

  // src/utilities/type.js
  var normalizeContentType = (contentType) => contentType.split(";")[0].trim().toLowerCase();
  var getFileExtension = (url) => {
    const match = url.match(/\.([^./?]+)(?:[?#]|$)/);
    return match ? match[1].toLowerCase() : null;
  };
  var getType = (url, responseHeaders, requestHeaders) => {
    const contentType = responseHeaders.get("Content-Type");
    if (contentType) {
      return normalizeContentType(contentType);
    }
    if (requestHeaders) {
      if (requestHeaders.Accept) {
        const acceptTypes = requestHeaders.Accept.split(",");
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
    const initialCreateTrustedHTML = initialOptions.createTrustedHTML;
    const initialTrustedTypesPolicy = initialOptions.trustedTypesPolicy;
    initialOptions = {
      ...DEFAULT_VALUES,
      ...cloneRecursive(initialOptions)
    };
    let lastExecutionTime = 0;
    let activeRequests = 0;
    let totalRequests = 0;
    let debounceTimeout = null;
    let debounceOptions = null;
    const debounceResolvers = [];
    const concurrencyQueue = [];
    if (initialOptions.maxConcurrency !== void 0 && (!Number.isInteger(initialOptions.maxConcurrency) || initialOptions.maxConcurrency <= 0)) {
      throw new TypeError("maxConcurrency must be a positive integer");
    }
    const throttle = async (throttleValue) => {
      const now = Date.now();
      const waitTime = throttleValue - (now - lastExecutionTime);
      lastExecutionTime = now + (waitTime > 0 ? waitTime : 0);
      await delay(waitTime);
    };
    const drainConcurrencyQueue = () => {
      while (concurrencyQueue.length > 0) {
        const queued = concurrencyQueue[0];
        if (activeRequests >= queued.maximum) {
          return;
        }
        concurrencyQueue.shift();
        queued.signal?.removeEventListener("abort", queued.abort);
        if (queued.signal?.aborted) {
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
    const releaseConcurrency = () => {
      activeRequests--;
      drainConcurrencyQueue();
    };
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
        redirect: options.redirect,
        body: options.body ? JSON.stringify(options.body) : void 0
      };
      let url = (options.domain || "") + (options.path || "");
      if (options.queryParams) {
        url += `?${new URLSearchParams(options.queryParams).toString()}`;
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
          return [new Error("Invalid response"), response, null];
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
            const createTrustedHTML = Object.hasOwn(
              options,
              "perCallCreateTrustedHTML"
            ) ? options.perCallCreateTrustedHTML : Object.hasOwn(options, "perCallTrustedTypesPolicy") ? options.perCallTrustedTypesPolicy.createHTML.bind(
              options.perCallTrustedTypesPolicy
            ) : initialCreateTrustedHTML || initialTrustedTypesPolicy?.createHTML.bind(
              initialTrustedTypesPolicy
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
                {
                  const responseText = await response.text();
                  result = createTrustedHTML ? createTrustedHTML(responseText) : responseText;
                  const template = document.createElement("template");
                  try {
                    template.innerHTML = result;
                  } catch (error) {
                    if (!createTrustedHTML) {
                      throw new Error(
                        "HTML parsing requires createTrustedHTML or trustedTypesPolicy",
                        { cause: error }
                      );
                    }
                    throw error;
                  }
                  result = template.content.childNodes;
                }
                break;
              case "text/html":
              case "html":
                {
                  const responseText = await response.text();
                  result = createTrustedHTML ? createTrustedHTML(responseText) : responseText;
                  try {
                    result = new DOMParser().parseFromString(result, "text/html");
                  } catch (error) {
                    if (!createTrustedHTML) {
                      throw new Error(
                        "HTML parsing requires createTrustedHTML or trustedTypesPolicy",
                        { cause: error }
                      );
                    }
                    throw error;
                  }
                }
                break;
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
      const retryRequest = async () => {
        let attempt = 0;
        const retryAttempts = options.retryAttempts || 0;
        const retryDelay = options.retryDelay || 0;
        while (attempt <= retryAttempts) {
          const [error, response, result] = await executeFetch();
          if (!error) {
            return [error, response, result];
          }
          if (controller.signal.aborted) {
            return [error, response, result];
          }
          if (response?.ok) {
            return [error, response, result];
          }
          if (response && !options.retryCodes?.includes(response.status)) {
            return [new Error("Invalid status code"), response, result];
          }
          attempt++;
          if (attempt > retryAttempts) {
            return [error, response, result];
          }
          let delayTime = retryDelay * 2 ** (attempt - 1);
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
          await delay(delayTime);
        }
        return executeFetch();
      };
      try {
        const [error, response, result] = await retryRequest();
        if (response && !response.ok) {
          return [new Error(response.statusText), response, result];
        }
        return [error, response, result];
      } finally {
        if (timeoutIdentifier !== null) {
          clearTimeout(timeoutIdentifier);
        }
        externalSignal?.removeEventListener("abort", abortFromExternal);
      }
    };
    const executeScheduled = async (options) => {
      if (options.delay) {
        await delay(options.delay);
      }
      if (options.throttle) {
        await throttle(options.throttle);
      }
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
          releaseConcurrency();
        }
      }
    };
    return (sendOptions = {}) => {
      try {
        validateTrustedHTMLOptions(sendOptions);
      } catch (error) {
        return Promise.resolve([error, null, null]);
      }
      const options = {
        ...initialOptions,
        ...cloneRecursive(sendOptions)
      };
      if (Object.hasOwn(sendOptions, "createTrustedHTML")) {
        options.perCallCreateTrustedHTML = sendOptions.createTrustedHTML;
      }
      if (Object.hasOwn(sendOptions, "trustedTypesPolicy")) {
        options.perCallTrustedTypesPolicy = sendOptions.trustedTypesPolicy;
      }
      if (initialOptions.headers) {
        options.headers = {
          ...initialOptions.headers,
          ...options.headers
        };
      }
      if (!options.debounce) {
        return executeScheduled(options);
      }
      debounceOptions = options;
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
            if (debounceOptions === options) {
              debounceOptions = debounceResolvers.at(-1)?.options || null;
            }
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
          const settledOptions = debounceOptions;
          debounceTimeout = null;
          debounceOptions = null;
          if (pendingResolvers.length === 0) {
            return;
          }
          const result = await executeScheduled(settledOptions);
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

  // src/index.base.iife.js
  iife(["vroagn"], {
    create
  });
})();
//# sourceMappingURL=vroagn.base.iife.js.map
