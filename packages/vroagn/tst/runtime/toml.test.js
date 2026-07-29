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
    tomlParser,
} from '../../src/index.js'

describe('TOML Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem = "ipsum"\nDolor = "sit"\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse TOML response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/toml.toml',
      parsers: [
        tomlParser(),
      ],
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), {
      Lorem: 'ipsum',
      Dolor: 'sit',
    })
  })
})
