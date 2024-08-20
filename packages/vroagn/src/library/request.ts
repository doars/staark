import {
  cloneRecursive,
} from '../utilities/clone.js'
import {
  delay,
} from '../utilities/delay.js'
import { getType } from '../utilities/type.js'

export interface ResponseParser {
  types: string[],
  parser: (
    response: Response,
    options: RequestOptions,
  ) => any,
}

export interface SendOptions {
  body?: any
  credentials?: RequestCredentials
  domain?: string
  headers?: Record<string, string>
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head'
  mode?: RequestMode
  path?: string
  priority?: 'high' | 'normal' | 'low'
  queryParams?: Record<string, string>
  redirect?: RequestRedirect,
  responseParsers?: ResponseParser[],
  type?: string,

  abort?: AbortController
  cache?: RequestCache

  debounce?: number
  delay?: number
  throttle?: number
  timeout?: number
  retryAttempts?: number
  retryCodes?: number[]
  retryDelay?: number
}

export interface RequestOptions extends SendOptions {
  maxConcurrency?: number
  maxRequests?: number
}

const DEFAULT_VALUES: RequestOptions = {
  method: 'get',
  retryCodes: [429, 503, 504,],
  retryDelay: 500,
}

// TODO: If the response is "429 Too Many Requests" or "503 Service unavailable" and retry after is later than the retry delay than use that moment instead. https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After

export const create = (
  initialOptions: RequestOptions,
) => {
  initialOptions = {
    ...DEFAULT_VALUES,
    ...cloneRecursive(initialOptions),
  }

  let lastExecutionTime = 0
  let activeRequests = 0
  let totalRequests = 0 // TODO: Add support for max requests options.
  let debounceTimeout: number | null = null

  const throttle = async (
    throttleValue: number,
  ) => {
    const now = Date.now()
    const waitTime = throttleValue - (now - lastExecutionTime)
    lastExecutionTime = now + (
      waitTime > 0
        ? waitTime
        : 0
    )
    await delay(waitTime)
  }

  const debounce = (
    debounceValue: number,
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      debounceTimeout = setTimeout(
        resolve,
        debounceValue,
      )
    })
  }

  const sendRequest = async (
    options: RequestOptions,
  ): Promise<[Response, any]> => {
    const config: RequestInit = {
      cache: options.cache,
      credentials: options.credentials,
      headers: options.headers,
      method: options.method,
      mode: options.mode,
      redirect: options.redirect,

      body: (
        options.body
          ? JSON.stringify(options.body)
          : undefined
      ),
    }

    let url = (options.domain || '') + (options.path || '')
    if (options.queryParams) {
      url += '?' + new URLSearchParams(
        options.queryParams,
      ).toString()
    }

    if (options.timeout) {
      const controller = (
        options.abort
        || new AbortController()
      )
      config.signal = controller.signal
      setTimeout(
        () => controller.abort(),
        options.timeout,
      );
    }

    const executeFetch = async (
    ): Promise<[Response, any]> => {
      const response = await fetch(
        url,
        config,
      )

      let result
      let foundParser = false
      const type = options.type || getType(url, response.headers, options.headers)
      if (options.responseParsers) {
        for (const parser of options.responseParsers) {
          foundParser = parser.types.includes(type)
          if (foundParser) {
            result = await parser.parser(
              response,
              options,
            )
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
            result = template.content.childNodes[0]
            break

          case 'text/html':
          case 'html':
            result = await response.text()
            result = (new DOMParser()).parseFromString(result, 'text/html')
            break

          case 'application/json':
          case 'text/json':
          case 'json':
            result = await response.json()
            break

          case 'image/svg+xml':
          case 'svg':
            result = await response.text()
            result = (new DOMParser()).parseFromString(result, 'image/svg+xml')
            break

          case 'application/xml':
          case 'text/xml':
          case 'xml':
            result = await response.text()
            result = (new DOMParser()).parseFromString(result, 'application/xml')
            break
        }
      }

      return [response, result]
    }

    const retryRequest = async (
    ): Promise<[Response, any]> => {
      let attempt = 0
      const retryAttempts = options.retryAttempts || 0
      const retryDelay = options.retryDelay || 0

      while (attempt < retryAttempts) {
        try {
          return await executeFetch()
        } catch (error) {
          // TODO: Only do on certain responses: retryCodes.

          attempt++
          if (attempt >= retryAttempts) {
            throw error
          }

          // Exponentially increase the retry delay.
          await delay(retryDelay * Math.pow(2, attempt - 1))
        }
      }
      return executeFetch()
    }

    try {
      const [response, result] = await retryRequest()
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      return [response, result]
    } catch (error) {
      throw error
    }
  }

  return async (
    sendOptions: SendOptions,
  ): Promise<[Response, any]> => {
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
      await new Promise((resolve) => {
        let interval: number | null = null
        const wait = () => {
          if (activeRequests >= options.maxConcurrency!) {
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
    try {
      return await sendRequest(
        options,
      )
    } finally {
      activeRequests--
    }
  }
}
