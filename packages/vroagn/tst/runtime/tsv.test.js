import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    csvParser,
} from '../../src/index.js'

describe('TSV Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem\tDolor\nipsum\tsit\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse TSV response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/tsv.tsv',
      parsers: [
        csvParser(),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual([['Lorem','Dolor'],['ipsum','sit']])
  })
})
