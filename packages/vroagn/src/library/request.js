import { cloneRecursive } from "../utilities/clone.js";
import { delay } from "../utilities/delay.js";
import { getType } from "../utilities/type.js";

/**
 * @typedef {Object} ResponseParser Defines a response parser.
 * @property {string[]} types The types of responses the parser can handle.
 * @property {(response: Response, options: RequestOptions, type: string) => any} parser The function to parse the response.
 **/

/**
 * @typedef {Object} SendOptions Defines the options for sending a request.
 * @property {any} [body] The body of the request.
 * @property {RequestCredentials} [credentials] The credentials for the request.
 * @property {string} [domain] The domain for the request.
 * @property {HeadersInit} [headers] The headers for the request.
 * @property {'get' | 'post' | 'put' | 'delete' | 'patch' | 'head'} [method] The HTTP method for the request.
 * @property {RequestMode} [mode] The mode for the request.
 * @property {string} [path] The path for the request.
 * @property {'high' | 'normal' | 'low'} [priority] The priority of the request.
 * @property {Record<string, string>} [queryParams] The query parameters for the request.
 * @property {RequestRedirect} [redirect] The redirect mode for the request.
 * @property {ResponseParser[]} [parsers] The parsers for the response.
 * @property {string} [type] The expected response type.
 * @property {AbortController} [abort] The abort controller for the request.
 * @property {RequestCache} [cache] The cache mode for the request.
 * @property {(request: Request | string, requestOptions?: RequestInit) => Promise<Response>} [fetch] The fetch function to use for the request.
 * @property {number} [debounce] The debounce time for the request.
 * @property {number} [delay] The delay time for the request.
 * @property {number} [throttle] The throttle time for the request.
 * @property {number} [timeout] The timeout for the request.
 * @property {number} [retryAttempts] The number of retry attempts for the request.
 * @property {number[]} [retryCodes] The HTTP status codes that should trigger a retry.
 * @property {number} [retryDelay] The delay between retry attempts.
 * @property {number} [maximumRetryDelay] Maximum delay between retry attempts.
 * @property {(html: string) => any} [createTrustedHTML] Converts trusted response text for HTML parsing sinks.
 * @property {{createHTML: (html: string) => any}} [trustedTypesPolicy] Trusted Types policy used for HTML parsing sinks.
 **/

/**
 * @typedef {SendOptions & { maxConcurrency?: number, maxRequests?: number }} RequestOptions Defines the options for creating a request handler.
 */

// Default values for the request handler.
const DEFAULT_VALUES = {
	method: "get",
	retryCodes: [429, 503, 504],
	retryDelay: 500,
};

/**
 * Creates a request handler.
 *
 * @param {RequestOptions} initialOptions The initial options for the request handler.
 * @returns {(sendOptions: SendOptions) => Promise<[Error | null, Response | null, any]>} The request handler.
 */
export const create = (initialOptions) => {
	const validateTrustedHTMLOptions = (options) => {
		if (
			Object.hasOwn(options, "createTrustedHTML") &&
			typeof options.createTrustedHTML !== "function"
		) {
			throw new TypeError("createTrustedHTML must be a function");
		}
		if (
			Object.hasOwn(options, "trustedTypesPolicy") &&
			(typeof options.trustedTypesPolicy !== "object" ||
				options.trustedTypesPolicy === null ||
				typeof options.trustedTypesPolicy.createHTML !== "function")
		) {
			throw new TypeError("trustedTypesPolicy.createHTML must be a function");
		}
	};
	validateTrustedHTMLOptions(initialOptions);
	const initialCreateTrustedHTML = initialOptions.createTrustedHTML;
	const initialTrustedTypesPolicy = initialOptions.trustedTypesPolicy;
	initialOptions = {
		...DEFAULT_VALUES,
		...cloneRecursive(initialOptions),
	};

	let lastExecutionTime = 0;
	let activeRequests = 0;
	let totalRequests = 0;
	let debounceTimeout = null;
	let debounceOptions = null;
	const debounceResolvers = [];
	const concurrencyQueue = [];

	if (
		initialOptions.maxConcurrency !== undefined &&
		(!Number.isInteger(initialOptions.maxConcurrency) ||
			initialOptions.maxConcurrency <= 0)
	) {
		throw new TypeError("maxConcurrency must be a positive integer");
	}

	/**
	 * @param {number} throttleValue
	 */
	const throttle = async (throttleValue) => {
		const now = Date.now();
		const waitTime = throttleValue - (now - lastExecutionTime);
		lastExecutionTime = now + Math.max(waitTime, 0);
		await delay(waitTime);
	};

	/**
	 * Debounces the request handler.
	 *
	 * @param {number} debounceValue The debounce time in milliseconds.
	 * @returns {Promise<void>} A promise that resolves after the debounce time.
	 */
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

	const acquireConcurrency = (maximum, signal) =>
		new Promise((resolve, reject) => {
			const queued = {
				maximum,
				reject,
				resolve,
				signal,
			};
			const abort = () => {
				const index = concurrencyQueue.indexOf(queued);
				if (index >= 0) {
					concurrencyQueue.splice(index, 1);
					reject(
						signal.reason || new DOMException("Request aborted", "AbortError"),
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

	/**
	 * Sends a request.
	 *
	 * @param {RequestOptions} options The options for the request.
	 * @returns {Promise<[Error | null, Response | null, any]>} The error, response and result of the request.
	 */
	const sendRequest = async (options) => {
		if (
			options.maxRequests !== undefined &&
			totalRequests >= options.maxRequests
		) {
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
			body: options.body ? JSON.stringify(options.body) : undefined,
		};

		let url = (options.domain || "") + (options.path || "");
		const query = new URLSearchParams(options.queryParams).toString();
		if (query) {
			// Add the query before any fragment, after any existing query.
			url = url.replace(
				/^[^#]*/,
				(base) => base + (base.includes("?") ? "&" : "?") + query,
			);
		}

		const externalSignal = options.abort?.signal || options.abort;
		const controller = new AbortController();
		const abortFromExternal = () => controller.abort(externalSignal.reason);
		if (externalSignal?.aborted) {
			abortFromExternal();
		} else {
			externalSignal?.addEventListener("abort", abortFromExternal, {
				once: true,
			});
		}
		config.signal = controller.signal;
		const timeoutIdentifier = options.timeout
			? setTimeout(
					() =>
						controller.abort(
							new DOMException("Request timed out", "TimeoutError"),
						),
					options.timeout,
				)
			: null;

		/**
		 * @returns {Promise<[Error | null, Response, any]>}
		 */
		const executeFetch = async () => {
			let response;
			try {
				response = await (options.fetch ?? fetch)(url, config);
			} catch (error) {
				return [
					error instanceof Error ? error : new Error("Unknown fetch error"),
					null,
					null,
				];
			}
			if (!response.ok) {
				return [new Error("Invalid response"), response, null];
			}

			try {
				let result;
				let foundParser = false;
				const type =
					options.type || getType(url, response.headers, options.headers);
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
						"perCallCreateTrustedHTML",
					)
						? options.perCallCreateTrustedHTML
						: Object.hasOwn(options, "perCallTrustedTypesPolicy")
							? options.perCallTrustedTypesPolicy.createHTML.bind(
									options.perCallTrustedTypesPolicy,
								)
							: initialCreateTrustedHTML ||
								initialTrustedTypesPolicy?.createHTML.bind(
									initialTrustedTypesPolicy,
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
								result = createTrustedHTML
									? createTrustedHTML(responseText)
									: responseText;
								const template = document.createElement("template");
								try {
									template.innerHTML = result;
								} catch (error) {
									if (!createTrustedHTML) {
										throw new Error(
											"HTML parsing requires createTrustedHTML or trustedTypesPolicy",
											{ cause: error },
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
								result = createTrustedHTML
									? createTrustedHTML(responseText)
									: responseText;
								try {
									result = new DOMParser().parseFromString(result, "text/html");
								} catch (error) {
									if (!createTrustedHTML) {
										throw new Error(
											"HTML parsing requires createTrustedHTML or trustedTypesPolicy",
											{ cause: error },
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
								"application/xml",
							);
							break;
					}
				}

				return [null, response, result];
			} catch (error) {
				return [
					error || new Error("Thrown parsing error is falsy"),
					response,
					null,
				];
			}
		};

		/**
		 * Retries the request.
		 *
		 * @returns {Promise<[Error | null, Response, any]>} The error, response and result of the request.
		 */
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
						delayTime = Math.max(delayTime, retryAfterSeconds * 1000);
					} else {
						const retryAfterDate = new Date(retryAfter).getTime();
						if (!Number.isNaN(retryAfterDate)) {
							const currentTime = Date.now();
							delayTime = Math.max(delayTime, retryAfterDate - currentTime);
						}
					}
				}
				if (options.maximumRetryDelay !== undefined) {
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
				null,
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
				null,
			];
		} finally {
			if (acquired) {
				releaseConcurrency();
			}
		}
	};

	/**
	 * Sends a request.
	 *
	 * @param {SendOptions} sendOptions The options for sending the request.
	 * @returns {Promise<[Error | null, Response | null, any]>} The error, response and result of the request.
	 */
	return (sendOptions = {}) => {
		const options = {
			...initialOptions,
			...cloneRecursive(sendOptions),
		};
		try {
			validateTrustedHTMLOptions(sendOptions);
			// Merge the headers, letting the per-call headers take precedence.
			options.headers = new Headers(initialOptions.headers);
			for (const [key, value] of new Headers(sendOptions.headers)) {
				options.headers.set(key, value);
			}
		} catch (error) {
			return Promise.resolve([error, null, null]);
		}
		if (Object.hasOwn(sendOptions, "createTrustedHTML")) {
			options.perCallCreateTrustedHTML = sendOptions.createTrustedHTML;
		}
		if (Object.hasOwn(sendOptions, "trustedTypesPolicy")) {
			options.perCallTrustedTypesPolicy = sendOptions.trustedTypesPolicy;
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
				signal,
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
						null,
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
						pendingResolver.abort,
					);
					pendingResolver.resolve(result);
				}
			}, options.debounce);
		});
	};
};
