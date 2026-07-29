import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'
import { Window } from 'happy-dom'

import {
    create,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.DOMParser = window.DOMParser

describe('Element Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('<h1>Lorem ipsum</h1>\n<p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse HTML partial', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/element.html',
      type: 'text/html-partial',
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.strictEqual(result.length, 4) // h1, text, p, text
  })
})
