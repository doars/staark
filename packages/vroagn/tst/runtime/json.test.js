import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'

import {
    create,
} from '../../src/index.js'

describe('JSON Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from(JSON.stringify({ Lorem: 'ipsum', Dolor: 'sit' })))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse JSON response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/json.json',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, { Lorem: 'ipsum', Dolor: 'sit' })
  })
})
