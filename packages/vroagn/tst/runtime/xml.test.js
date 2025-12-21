import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
} from '../../src/index.js'

describe('XML Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('<?xml version="1.0" encoding="UTF-8" ?>\n<root>\n    <Lorem>ipsum</Lorem>\n    <Dolor>sit</Dolor>\n</root>\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should return XML as text', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/xml.xml',
      type: 'text',
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toBe('<?xml version="1.0" encoding="UTF-8" ?>\n<root>\n    <Lorem>ipsum</Lorem>\n    <Dolor>sit</Dolor>\n</root>\n')
  })
})
