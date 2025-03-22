import { cloneRecursive } from '../utilities/clone.js'
import { delay } from '../utilities/delay.js'
import { getType } from '../utilities/type.js'

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
 * @property {Record<string, string>} [headers] The headers for the request.
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
 **/

/**
 * @typedef {SendOptions & { maxConcurrency?: number, maxRequests?: number }} RequestOptions Defines the options for creating a request handler.
 */

// Default values for the request handler.
const DEFAULT_VALUES = {
  method: 'get',
  retryCodes: [429, 503, 504],
  retryDelay: 500,
}

/**
 * Creates a request handler.
 *
 * @param {RequestOptions} initialOptions The initial options for the request handler.
 * @returns {(sendOptions: SendOptions) => Promise<[Error | null, Response | null, any]>} The request handler.
 */
export const create = (
  initialOptions,
) => {
  initialOptions = {
    ...DEFAULT_VALUES,
    ...cloneRecursive(initialOptions),
  }

  let lastExecutionTime = 0
  let activeRequests = 0
  let totalRequests = 0
  let debounceTimeout = null

  /**
   * @param {number} throttleValue
   */
  const throttle = async (
    throttleValue,
  ) => {
    const now = Date.now()
    const waitTime = throttleValue - (now - lastExecutionTime)
    lastExecutionTime = now + (waitTime > 0 ? waitTime : 0)
    await delay(waitTime)
  }

  /**
   * Debounces the request handler.
   *
   * @param {number} debounceValue The debounce time in milliseconds.
   * @returns {Promise<void>} A promise that resolves after the debounce time.
   */
  const debounce = (
    debounceValue,
  ) => {
    return new Promise((resolve) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      debounceTimeout = setTimeout(resolve, debounceValue)
    })
  }

  /**
   * Sends a request.
   *
   * @param {RequestOptions} options The options for the request.
   * @returns {Promise<[Error | null, Response | null, any]>} The error, response and result of the request.
   */
  const sendRequest = async (
    options,
  ) => {
    if (
      options.maxRequests !== undefined
      && totalRequests >= options.maxRequests
    ) {
      return [new Error('Maximum request limit reached'), null, null]
    }

    totalRequests++

    const config = {
      cache: options.cache,
      credentials: options.credentials,
      headers: options.headers,
      method: options.method,
      mode: options.mode,
      redirect: options.redirect,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }

    let url = (options.domain || '') + (options.path || '')
    if (options.queryParams) {
      url += '?' + new URLSearchParams(options.queryParams).toString()
    }

    if (options.timeout) {
      const controller = options.abort || new AbortController()
      config.signal = controller.signal
      setTimeout(() => controller.abort(), options.timeout)
    }

    /**
     * @returns {Promise<[Error | null, Response, any]>}
     */
    const executeFetch = async () => {
      const response = await (options.fetch ?? fetch)(url, config)
      if (!response.ok) {
        return [new Error('Invalid response'), response, null]
      }

      try {
        let result
        let foundParser = false
        const type = options.type || getType(url, response.headers, options.headers)
        if (options.parsers) {
          for (const parser of options.parsers) {
            foundParser = parser.types.includes(type)
            if (foundParser) {
              result = await parser.parser(response, options, type)
              break
            }
          }
        }
        if (!foundParser) {
          switch (type.toLowerCase()) {
            case 'arraybuffer':
              result = await response.arrayBuffer()
              break
            case 'blob':
              result = await response.blob()
              break
            case 'formdata':
              result = await response.formData()
              break
            case 'text/plain':
            case 'text':
            case 'txt':
              result = await response.text()
              break
            case 'text/html-partial':
            case 'html-partial':
              result = await response.text()
              const template = document.createElement('template')
              template.innerHTML = result
              result = template.content.childNodes
              break
            case 'text/html':
            case 'html':
              result = await response.text()
              result = new DOMParser().parseFromString(result, 'text/html')
              break
            case 'application/json':
            case 'text/json':
            case 'json':
              result = await response.json()
              break
            case 'image/svg+xml':
            case 'svg':
              result = await response.text()
              result = new DOMParser().parseFromString(result, 'image/svg+xml')
              break
            case 'application/xml':
            case 'text/xml':
            case 'xml':
              result = await response.text()
              result = new DOMParser().parseFromString(result, 'application/xml')
              break
          }
        }

        return [null, response, result]
      } catch (error) {
        return [error || new Error('Thrown parsing error is falsy'), response, null]
      }
    }

    /**
     * Retries the request.
     *
     * @returns {Promise<[Error | null, Response, any]>} The error, response and result of the request.
     */
    const retryRequest = async () => {
      let attempt = 0
      const retryAttempts = options.retryAttempts || 0
      const retryDelay = options.retryDelay || 0

      while (attempt < retryAttempts) {
        const [error, response, result] = await executeFetch()
        if (!error) {
          return [error, response, result]
        }
        if (!options.retryCodes?.includes(response.status || 200)) {
          return [new Error('Invalid status code'), response, result]
        }

        attempt++
        if (attempt >= retryAttempts) {
          return [new Error('Too many retry attempts'), response, result]
        }

        let delayTime = retryDelay * Math.pow(2, attempt - 1)

        const retryAfter = response.headers.get('Retry-After')
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10)
          if (!isNaN(retryAfterSeconds)) {
            delayTime = Math.max(delayTime, retryAfterSeconds * 1000)
          } else {
            const retryAfterDate = new Date(retryAfter).getTime()
            if (!isNaN(retryAfterDate)) {
              const currentTime = Date.now()
              delayTime = Math.max(delayTime, retryAfterDate - currentTime)
            }
          }
        }

        await delay(delayTime)
      }
      return executeFetch()
    }

    const [error, response, result] = await retryRequest()
    if (!response.ok) {
      return [new Error(response.statusText), response, result]
    }
    return [error, response, result]
  }

  /**
   * Sends a request.
   *
   * @param {SendOptions} sendOptions The options for sending the request.
   * @returns {Promise<[Error | null, Response | null, any]>} The error, response and result of the request.
   */
  return async (
    sendOptions,
  ) => {
    const options = {
      ...initialOptions,
      ...cloneRecursive(sendOptions),
    }
    if (initialOptions.headers) {
      options.headers = {
        ...initialOptions.headers,
        ...options.headers,
      }
    }

    if (options.debounce) {
      await debounce(options.debounce)
    }

    if (options.delay) {
      await delay(options.delay)
    }

    if (options.throttle) {
      await throttle(options.throttle)
    }

    if (
      options.maxConcurrency
      && activeRequests >= options.maxConcurrency
    ) {
      await new Promise(resolve => {
        let interval = null
        const wait = () => {
          if (activeRequests >= options.maxConcurrency) {
            interval = requestAnimationFrame(wait)
          } else {
            if (interval) {
              clearInterval(interval)
            }
            resolve(null)
          }
        }
        interval = requestAnimationFrame(wait)
      })
    }

    activeRequests++
    const results = await sendRequest(options)
    activeRequests--
    return results
  }
}
