import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'

import {
    create,
    csvParser,
} from '../../src/index.js'

describe('CSV Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem,Dolor\nipsum,sit\n'))
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse CSV response', async () => {
    const request = create({
      domain: 'http://localhost:3000',
      path: '/packages/vroagn/tst/data/csv.csv',
      parsers: [
        csvParser(),
      ],
    })

    const [error, _response, result] = await request()
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [['Lorem','Dolor'],['ipsum','sit']])
  })
})

describe('CSV Headers Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem,Dolor\nipsum,sit\n'))
  })

  after(() => {
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
    assert.strictEqual(error, null)
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), [{
      Lorem: 'ipsum',
      Dolor: 'sit',
    }])
  })
})

describe('CSV Semicolons Request', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(Buffer.from('Lorem;Dolor\nipsum;sit\n'))
  })

  after(() => {
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
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [['Lorem','Dolor'],['ipsum','sit']])
  })
})
