import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
} from '../../src/index.js'

describe('TXT Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('Lorem ipsum\nDolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should return text content', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/txt.txt',
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toBe('Lorem ipsum\nDolor sit amet consectetur adipisicing elit. Nihil soluta doloremque quo fuga.\n')
  })
})
