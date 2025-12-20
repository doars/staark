import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
} from '../../src/index.js'

describe('JSON Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ Lorem: 'ipsum', Dolor: 'sit' }))))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse JSON response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/json.json',
    })

    const [error, response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual({ Lorem: 'ipsum', Dolor: 'sit' })
  })
})
