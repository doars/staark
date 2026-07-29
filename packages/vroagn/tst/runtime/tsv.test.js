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
    csvParser,
} from '../../src/index.js'

describe('TSV Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem\tDolor\nipsum\tsit\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse TSV response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/tsv.tsv',
      parsers: [
        csvParser(),
      ],
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [['Lorem','Dolor'],['ipsum','sit']])
  })
})
