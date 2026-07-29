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

describe('XML Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('<?xml version="1.0" encoding="UTF-8" ?>\n<root>\n    <Lorem>ipsum</Lorem>\n    <Dolor>sit</Dolor>\n</root>\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should return XML as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/xml.xml',
      type: 'text',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.strictEqual(result, '<?xml version="1.0" encoding="UTF-8" ?>\n<root>\n    <Lorem>ipsum</Lorem>\n    <Dolor>sit</Dolor>\n</root>\n')
  })
})
