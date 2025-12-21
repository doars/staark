import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
} from '../../src/index.js'

describe('HTML Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('<html lang="en">\n\n  <body>\n    <h1>Lorem ipsum</h1>\n    <p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n  </body>\n\n</html>\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should return HTML as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/html.html',
      type: 'text',
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toBe('<html lang="en">\n\n  <body>\n    <h1>Lorem ipsum</h1>\n    <p>Dolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.</p>\n  </body>\n\n</html>\n')
  })
})
