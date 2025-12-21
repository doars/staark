import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    csvParser,
} from '../../src/index.js'

describe('CSV Semicolons Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem;Dolor\nipsum;sit\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse CSV with semicolon delimiter', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/csv-semicolons.csv',
      parsers: [
        csvParser({
          columnDelimiter: ';',
        }),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual([['Lorem','Dolor'],['ipsum','sit']])
  })
})
