import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    csvParser,
} from '../../src/index.js'

describe('CSV Headers Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem,Dolor\nipsum,sit\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse CSV with headers', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/csv.csv',
      parsers: [
        csvParser({
          hasHeaders: true,
        }),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual([{ Lorem: 'ipsum', Dolor: 'sit' }])
  })
})
