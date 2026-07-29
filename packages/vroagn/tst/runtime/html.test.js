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

describe('HTML Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('<html lang="en">\n\n  <body>\n    <h1>Lorem ipsum</h1>\n    <p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n  </body>\n\n</html>\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should return HTML as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/html.html',
      type: 'text',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.strictEqual(result, '<html lang="en">\n\n  <body>\n    <h1>Lorem ipsum</h1>\n    <p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n  </body>\n\n</html>\n')
  })
})
