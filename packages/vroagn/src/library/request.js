import { cloneRecursive } from '../utilities/clone.js'
import { delay } from '../utilities/delay.js'
import { getType } from '../utilities/type.js'

/**
 * @typedef {Object} ResponseParser
 * @property {string[]} types
 * @property {(response: Response, options: RequestOptions, type: string) => any} parser
 */

/**
 * @typedef {Object} SendOptions
 * @property {any} [body]
 * @property {RequestCredentials} [credentials]
 * @property {string} [domain]
 * @property {Record<string, string>} [headers]
 * @property {'get' | 'post' | 'put' | 'delete' | 'patch' | 'head'} [method]
 * @property {RequestMode} [mode]
 * @property {string} [path]
 * @property {'high' | 'normal' | 'low'} [priority]
 * @property {Record<string, string>} [queryParams]
 * @property {RequestRedirect} [redirect]
 * @property {ResponseParser[]} [parsers]
 * @property {string} [type]
 * @property {AbortController} [abort]
 * @property {RequestCache} [cache]
 * @property {(request: Request | string, requestOptions?: RequestInit) => Promise<Response>} [fetch]
 * @property {number} [debounce]
 * @property {number} [delay]
 * @property {number} [throttle]
 * @property {number} [timeout]
 * @property {number} [retryAttempts]
 * @property {number[]} [retryCodes]
 * @property {number} [retryDelay]
 */

/**
 * @typedef {SendOptions & { maxConcurrency?: number, maxRequests?: number }} RequestOptions
 */

const DEFAULT_VALUES = {
  method: 'get',
  retryCodes: [429, 503, 504],
  retryDelay: 500,
}

/**
 * @param {RequestOptions} initialOptions
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
   * @param {number} debounceValue
   * @returns {Promise<void>}
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
   * @param {RequestOptions} options
   * @returns {Promise<[Error | null, Response | null, any]>}
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
     * @returns {Promise<[Error | null, Response, any]>}
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
   * @param {SendOptions} sendOptions
   * @returns {Promise<[Error | null, Response | null, any]>}
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
