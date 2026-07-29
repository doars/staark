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
