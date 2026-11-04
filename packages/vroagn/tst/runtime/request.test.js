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
    assert.deepStrictEqual(receivedOptions.headers, {
      Accept: 'application/json',
      Authorization: 'updated',
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

  it('rejects invalid trusted HTML options', async () => {
    assert.throws(() => create({ createTrustedHTML: true }), TypeError)
    const request = create({ fetch: async () => new Response('ok') })
    const [error] = await request({ trustedTypesPolicy: {} })
    assert(error instanceof TypeError)
  })
})
