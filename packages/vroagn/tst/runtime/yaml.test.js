import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

import {
    create,
    yamlParser,
} from '../../src/index.js'

describe('YAML Request', () => {
  let originalFetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = mock(() => Promise.resolve(new Response('---\nLorem: ipsum\nDolor: sit\n')))
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse YAML response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/yaml.yaml',
      parsers: [
        yamlParser(),
      ],
    })

    const [error, _response, result] = await request()
    expect(error).toBe(null)
    expect(result).toEqual({ Lorem: 'ipsum', Dolor: 'sit' })
  })
})
