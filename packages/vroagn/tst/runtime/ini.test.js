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
    iniParser,
} from '../../src/index.js'

describe('INI Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem=ipsum\nDolor=sit\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse INI response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/ini.ini',
      parsers: [
        iniParser(),
      ],
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), {
      global: { Lorem: 'ipsum', Dolor: 'sit' },
    })
  })
})
