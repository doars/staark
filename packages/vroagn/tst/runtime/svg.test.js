import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
} from '../../src/index.js'

describe('SVG Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="50" fill="#000" />\n</svg>\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should return SVG as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/svg.svg',
      type: 'text',
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toBe('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="50" fill="#000" />\n</svg>\n')
  })
})
