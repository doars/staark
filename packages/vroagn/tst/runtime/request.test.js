import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { create } from '../../src/index.js'

describe('Request', () => {
  it('merges options and sends the expected fetch request', async () => {
    let receivedUrl
    let receivedOptions
    const request = create({
      domain: 'https://example.test',
      headers: {
        Accept: 'application/json',
        Authorization: 'secret',
      },
      method: 'post',
      path: '/initial',
      fetch: async (url, options) => {
        receivedUrl = url
        receivedOptions = options
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    })

    const [error, response, result] = await request({
      body: {
        name: 'Staark',
      },
      headers: {
        Authorization: 'updated',
      },
      path: '/resource',
      queryParams: {
        page: '2',
      },
    })

    assert.strictEqual(error, null)
    assert.strictEqual(response.ok, true)
    assert.deepStrictEqual(result, { success: true })
    assert.strictEqual(receivedUrl, 'https://example.test/resource?page=2')
    assert.strictEqual(receivedOptions.method, 'post')
    assert.strictEqual(receivedOptions.body, '{"name":"Staark"}')
    assert.deepStrictEqual(Object.fromEntries(receivedOptions.headers), {
      accept: 'application/json',
      authorization: 'updated',
      'content-type': 'application/json',
    })
  })

  it('sends every documented fetch option', async () => {
    let receivedOptions
    const abort = new AbortController()
    const request = create({
      fetch: async (_url, options) => {
        receivedOptions = options
        return new Response('ok')
      },
    })

    await request({
      abort,
      cache: 'no-store',
      credentials: 'include',
      headers: { 'X-Test': '1' },
      method: 'put',
      mode: 'cors',
      priority: 'high',
      redirect: 'manual',
    })

    assert.strictEqual(receivedOptions.cache, 'no-store')
    assert.strictEqual(receivedOptions.credentials, 'include')
    assert.strictEqual(new Headers(receivedOptions.headers).get('x-test'), '1')
    assert.strictEqual(receivedOptions.method, 'put')
    assert.strictEqual(receivedOptions.mode, 'cors')
    assert.strictEqual(receivedOptions.priority, 'high')
    assert.strictEqual(receivedOptions.redirect, 'manual')
    assert(receivedOptions.signal instanceof AbortSignal)
  })

  it('appends query parameters to an existing query and before a fragment', async () => {
    const urls = []
    const request = create({
      fetch: async (url) => {
        urls.push(url)
        return new Response('ok')
      },
    })

    await request({ path: '/a?x=1', queryParams: { y: '2' } })
    await request({ path: '/a', queryParams: {} })
    await request({ path: '/a#top', queryParams: { y: '2' } })
    await request({ path: '/a?x=1#top', queryParams: { y: '2' } })

    assert.deepStrictEqual(urls, [
      '/a?x=1&y=2',
      '/a',
      '/a?y=2#top',
      '/a?x=1&y=2#top',
    ])
  })

  it('merges Headers instances with initial headers', async () => {
    const received = []
    const fetch = async (_url, options) => {
      received.push(Object.fromEntries(options.headers))
      return new Response('ok')
    }

    await create({ fetch, headers: { A: '1' } })({
      headers: new Headers({ B: '2' }),
    })
    await create({ fetch, headers: new Headers({ A: '1' }) })({
      headers: { a: '3', B: '2' },
    })

    assert.deepStrictEqual(received, [
      { a: '1', b: '2' },
      { a: '3', b: '2' },
    ])
  })

  it('reads the Accept header case-insensitively to choose the type', async () => {
    // A byte body leaves the response without a content type.
    const fetch = async () => new Response(new TextEncoder().encode('{"a":1}'))
    const [, , lowercaseResult] = await create({ fetch })({
      headers: { accept: 'application/json' },
    })
    const [, , instanceResult] = await create({ fetch })({
      headers: new Headers({ Accept: 'application/json' }),
    })

    assert.deepStrictEqual(lowercaseResult, { a: 1 })
    assert.deepStrictEqual(instanceResult, { a: 1 })
  })

  it('ignores the URL fragment when reading the file extension', async () => {
    const request = create({
      fetch: async () => new Response(new TextEncoder().encode('{"a":1}')),
    })
    const [, , result] = await request({ path: '/x.json#f' })
    assert.deepStrictEqual(result, { a: 1 })
  })

  it('returns invalid headers in the result tuple', async () => {
    const request = create({ fetch: async () => new Response('ok') })
    const [error] = await request({ headers: { 'in valid': '1' } })
    assert(error instanceof TypeError)
  })

  it('only encodes plain object and array bodies as JSON', async () => {
    const received = []
    const request = create({
      fetch: async (_url, options) => {
        received.push([options.body, options.headers.get('content-type')])
        return new Response('ok')
      },
      method: 'post',
    })
    const formData = new FormData()
    formData.set('a', '1')
    const blob = new Blob(['a'])
    const searchParams = new URLSearchParams({ a: '1' })
    const buffer = new ArrayBuffer(1)
    const nullPrototype = Object.create(null)
    nullPrototype.a = 1

    await request({ body: { a: 1 } })
    await request({ body: [1, 2] })
    await request({ body: nullPrototype })
    await request({ body: { a: 1 }, headers: { 'Content-Type': 'text/plain' } })
    await request({ body: 'text' })
    await request({ body: formData })
    await request({ body: blob })
    await request({ body: searchParams })
    await request({ body: buffer })

    assert.deepStrictEqual(received.slice(0, 4), [
      ['{"a":1}', 'application/json'],
      ['[1,2]', 'application/json'],
      ['{"a":1}', 'application/json'],
      ['{"a":1}', 'text/plain'],
    ])
    const passed = ['text', formData, blob, searchParams, buffer]
    for (const [index, body] of passed.entries()) {
      assert.strictEqual(received[4 + index][0], body)
      assert.strictEqual(received[4 + index][1], null)
    }
  })

  it('uses a matching custom parser', async () => {
    const response = new Response('value', {
      headers: {
        'Content-Type': 'application/custom',
      },
    })
    const request = create({
      fetch: async () => response,
      parsers: [{
        types: ['application/custom'],
        parser: async (receivedResponse, _options, type) => ({
          text: await receivedResponse.text(),
          type,
        }),
      }],
    })

    const [error, receivedResponse, result] = await request({})

    assert.strictEqual(error, null)
    assert.strictEqual(receivedResponse, response)
    assert.deepStrictEqual(result, {
      text: 'value',
      type: 'application/custom',
    })
  })

  it('returns parser errors in the result tuple', async () => {
    const request = create({
      fetch: async () => new Response('invalid'),
      parsers: [{
        types: ['custom'],
        parser: async () => {
          throw new TypeError('Invalid custom response')
        },
      }],
      type: 'custom',
    })

    const [error, response, result] = await request({})

    assert(error instanceof TypeError)
    assert.strictEqual(error.message, 'Invalid custom response')
    assert.strictEqual(response.ok, true)
    assert.strictEqual(result, null)
  })

  it('returns rejected fetch errors in the result tuple', async () => {
    const request = create({
      fetch: async () => {
        throw new TypeError('Network unavailable')
      },
    })

    const [error, response, result] = await request({})

    assert(error instanceof TypeError)
    assert.strictEqual(error.message, 'Network unavailable')
    assert.strictEqual(response, null)
    assert.strictEqual(result, null)
  })

  it('returns unsuccessful responses with their status text', async () => {
    const response = new Response('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    })
    const request = create({
      fetch: async () => response,
    })

    const [error, receivedResponse, result] = await request({})

    assert(error instanceof Error)
    assert.strictEqual(error.message, 'Service Unavailable')
    assert.strictEqual(receivedResponse, response)
    assert.strictEqual(result, null)
  })

  it('describes unsuccessful responses without status text', async () => {
    const response = new Response('', { status: 404 })
    const request = create({
      fetch: async () => response,
    })

    const [error] = await request({})

    assert.strictEqual(error.message, 'Request failed with status 404')
    assert.strictEqual(error.status, 404)
    assert.strictEqual(error.response, response)
  })

  it('returns the last failed response once the retries run out', async () => {
    let fetchCount = 0
    const request = create({
      fetch: async () => {
        fetchCount++
        return new Response('', { status: 503, statusText: `Attempt ${fetchCount}` })
      },
      retryAttempts: 2,
      retryDelay: 1,
    })

    const [error, response] = await request({})

    assert.strictEqual(fetchCount, 3)
    assert.strictEqual(error.message, 'Attempt 3')
    assert.strictEqual(response.status, 503)
  })

  it('enforces the maximum request count without throwing', async () => {
    let fetchCount = 0
    const successfulResponse = new Response('ok')
    const request = create({
      fetch: async () => {
        fetchCount++
        return successfulResponse
      },
      maxRequests: 1,
      type: 'text',
    })

    const [firstError, firstResponse, firstResult] = await request({})
    assert.strictEqual(firstError, null)
    assert.strictEqual(firstResponse, successfulResponse)
    assert.strictEqual(firstResult, 'ok')
    const [error, response, result] = await request({})

    assert(error instanceof Error)
    assert.strictEqual(error.message, 'Maximum request limit reached')
    assert.strictEqual(response, null)
    assert.strictEqual(result, null)
    assert.strictEqual(fetchCount, 1)
  })
})

describe('Request scheduling', () => {
  it('settles all debounced callers with one trailing fetch', async () => {
    let fetchCount = 0
    const request = create({
      debounce: 5,
      fetch: async () => {
        fetchCount++
        return new Response('done')
      },
      type: 'text',
    })

    const results = await Promise.all([
      request({ path: '/first' }),
      request({ path: '/second' }),
      request({ path: '/third' }),
    ])

    assert.strictEqual(fetchCount, 1)
    for (const [error, _response, result] of results) {
      assert.strictEqual(error, null)
      assert.strictEqual(result, 'done')
    }
  })

  it('runs concurrency-limited requests in FIFO order without browser APIs', async () => {
    const started = []
    const releases = []
    const request = create({
      fetch: async (url) => {
        started.push(url)
        await new Promise((resolve) => releases.push(resolve))
        return new Response('done')
      },
      maxConcurrency: 1,
      type: 'text',
    })

    const pending = [
      request({ path: '/first' }),
      request({ path: '/second' }),
      request({ path: '/third' }),
    ]
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/first'])
    releases.shift()()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/first', '/second'])
    releases.shift()()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/first', '/second', '/third'])
    releases.shift()()
    await Promise.all(pending)
  })

  it('rejects invalid concurrency limits', () => {
    assert.throws(() => create({ maxConcurrency: 0 }), TypeError)
    assert.throws(() => create({ maxConcurrency: 1.5 }), TypeError)
  })

  it('drains a limited request after an unlimited request completes', async () => {
    const started = []
    const releases = []
    const request = create({
      fetch: async (url) => {
        started.push(url)
        await new Promise((resolve) => releases.push(resolve))
        return new Response('done')
      },
      type: 'text',
    })

    const unlimited = request({ path: '/unlimited' })
    const limited = request({ maxConcurrency: 1, path: '/limited' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/unlimited'])

    releases.shift()()
    await unlimited
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/unlimited', '/limited'])
    releases.shift()()
    await limited
  })

  it('removes an aborted queue head and admits the next request', async () => {
    const started = []
    const releases = []
    const request = create({
      fetch: async (url) => {
        started.push(url)
        await new Promise((resolve) => releases.push(resolve))
        return new Response('done')
      },
      maxConcurrency: 1,
      type: 'text',
    })
    const abort = new AbortController()

    const first = request({ path: '/first' })
    const aborted = request({ abort, path: '/aborted' })
    const third = request({ path: '/third' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    abort.abort()
    const [abortError] = await aborted
    assert.strictEqual(abortError.name, 'AbortError')
    releases.shift()()
    await first
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(started, ['/first', '/third'])
    releases.shift()()
    await third
  })

  it('rejects every queued request that shares an aborted signal', async () => {
    const releases = []
    const request = create({
      fetch: async () => {
        await new Promise((resolve) => releases.push(resolve))
        return new Response('done')
      },
      type: 'text',
    })
    const abort = new AbortController()

    const busy = request({ maxConcurrency: 1, path: '/busy' })
    const first = request({ abort, maxConcurrency: 1, path: '/first' })
    const second = request({ abort, maxConcurrency: 5, path: '/second' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    abort.abort()
    const results = await Promise.race([
      Promise.all([first, second]),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ])
    assert.notStrictEqual(results, 'timeout')
    assert.deepStrictEqual(
      results.map(([error]) => error.name),
      ['AbortError', 'AbortError'],
    )
    releases.shift()()
    await busy
  })

  it('cancels the body of a response before retrying', async () => {
    const cancelled = []
    const responses = []
    const request = create({
      fetch: async () => {
        const index = responses.length
        const response = new Response(new ReadableStream({
          cancel: () => {
            cancelled.push(index)
          },
        }), { status: 503 })
        responses.push(response)
        return response
      },
      retryAttempts: 1,
      retryDelay: 1,
    })

    const [, response] = await request({})

    assert.deepStrictEqual(cancelled, [0])
    assert.strictEqual(response, responses[1])
  })

  it('ends the retry delay when the request is aborted', async () => {
    const abort = new AbortController()
    const request = create({
      fetch: async () => new Response('', { status: 503 }),
      retryAttempts: 1,
      retryDelay: 1000,
    })

    const start = Date.now()
    setTimeout(() => abort.abort(), 20)
    const [error] = await request({ abort })

    assert.strictEqual(error.name, 'AbortError')
    assert(Date.now() - start < 500)
  })

  it('ends the retry delay when the request times out', async () => {
    const request = create({
      fetch: async () => new Response('', { status: 503 }),
      retryAttempts: 1,
      retryDelay: 1000,
      timeout: 20,
    })

    const start = Date.now()
    const [error] = await request({})

    assert.strictEqual(error.name, 'TimeoutError')
    assert(Date.now() - start < 500)
  })

  it('resolves with the abort error when aborted during a delay or throttle', async () => {
    let fetchCount = 0
    const request = create({
      fetch: async () => {
        fetchCount++
        return new Response('ok')
      },
    })
    await request({ throttle: 1000 })

    const start = Date.now()
    const delayAbort = new AbortController()
    const throttleAbort = new AbortController()
    const delayed = request({ abort: delayAbort, delay: 1000 })
    const throttled = request({ abort: throttleAbort, throttle: 1000 })
    setTimeout(() => {
      delayAbort.abort()
      throttleAbort.abort()
    }, 20)
    const [[delayError], [throttleError]] = await Promise.all([delayed, throttled])

    assert.strictEqual(delayError.name, 'AbortError')
    assert.strictEqual(throttleError.name, 'AbortError')
    assert.strictEqual(fetchCount, 1)
    assert(Date.now() - start < 500)
  })
})

describe('Trusted HTML parsing', () => {
  it('passes callback output to the partial HTML sink without coercion', async () => {
    const trustedValue = { trusted: true }
    const received = []
    const originalDocument = globalThis.document
    globalThis.document = {
      createElement: () => ({
        content: { childNodes: ['parsed'] },
        set innerHTML(value) {
          received.push(value)
        },
      }),
    }
    try {
      const request = create({
        createTrustedHTML: (html) => {
          assert.strictEqual(html, '<p>trusted</p>')
          return trustedValue
        },
        fetch: async () => new Response('<p>trusted</p>'),
        type: 'html-partial',
      })
      const [error, _response, result] = await request({})

      assert.strictEqual(error, null)
      assert.deepStrictEqual(result, ['parsed'])
      assert.strictEqual(received[0], trustedValue)
    } finally {
      globalThis.document = originalDocument
    }
  })

  it('uses per-call callback before initial and per-call policies', async () => {
    const calls = []
    const originalDocument = globalThis.document
    globalThis.document = {
      createElement: () => ({
        content: { childNodes: [] },
        set innerHTML(_value) {},
      }),
    }
    try {
      const request = create({
        createTrustedHTML: () => calls.push('initial callback'),
        fetch: async () => new Response('<p>trusted</p>'),
        type: 'html-partial',
      })
      await request({
        createTrustedHTML: (html) => {
          calls.push('per-call callback')
          return html
        },
        trustedTypesPolicy: {
          createHTML: () => calls.push('per-call policy'),
        },
      })
      assert.deepStrictEqual(calls, ['per-call callback'])
    } finally {
      globalThis.document = originalDocument
    }
  })

  it('uses a per-call policy before the initial callback and policy', async () => {
    const calls = []
    const originalDocument = globalThis.document
    globalThis.document = {
      createElement: () => ({
        content: { childNodes: [] },
        set innerHTML(_value) {},
      }),
    }
    try {
      const request = create({
        createTrustedHTML: (html) => {
          calls.push('initial callback')
          return html
        },
        fetch: async () => new Response('<p>trusted</p>'),
        trustedTypesPolicy: {
          createHTML: (html) => {
            calls.push('initial policy')
            return html
          },
        },
        type: 'html-partial',
      })
      await request({})
      await request({
        trustedTypesPolicy: {
          createHTML: (html) => {
            calls.push('per-call policy')
            return html
          },
        },
      })
      assert.deepStrictEqual(calls, ['initial callback', 'per-call policy'])
    } finally {
      globalThis.document = originalDocument
    }
  })

  it('rejects invalid trusted HTML options', async () => {
    assert.throws(() => create({ createTrustedHTML: true }), TypeError)
    const request = create({ fetch: async () => new Response('ok') })
    const [error] = await request({ trustedTypesPolicy: {} })
    assert(error instanceof TypeError)
  })
})
