import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
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

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('<h1>Lorem ipsum</h1>\n<p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse HTML partial', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/element.html',
      type: 'text/html-partial',
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result.length).toBe(4) // h1, text, p, text
  })
})
