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
    yamlParser,
} from '../../src/index.js'

describe('YAML Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('---\nLorem: ipsum\nDolor: sit\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse YAML response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/yaml.yaml',
      parsers: [
        yamlParser(),
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
