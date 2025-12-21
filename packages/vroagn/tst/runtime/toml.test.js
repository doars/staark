import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    tomlParser,
} from '../../src/index.js'

describe('TOML Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem = "ipsum"\nDolor = "sit"\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse TOML response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/toml.toml',
      parsers: [
        tomlParser(),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual({ Lorem: 'ipsum', Dolor: 'sit' })
  })
})
