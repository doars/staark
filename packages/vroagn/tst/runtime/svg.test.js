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

describe('SVG Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="50" fill="#000" />\n</svg>\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should return SVG as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/svg.svg',
      type: 'text',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.strictEqual(result, '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="50" fill="#000" />\n</svg>\n')
  })
})
