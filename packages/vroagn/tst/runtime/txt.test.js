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

describe('TXT Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem ipsum\nDolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should return text content', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/txt.txt',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'Lorem ipsum\nDolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.\n')
  })
})
