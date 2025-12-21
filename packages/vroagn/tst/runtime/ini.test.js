import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    iniParser,
} from '../../src/index.js'

describe('INI Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem=ipsum\nDolor=sit\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse INI response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/ini.ini',
      parsers: [
        iniParser(),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual({ global: { Lorem: 'ipsum', Dolor: 'sit' } })
  })
})
