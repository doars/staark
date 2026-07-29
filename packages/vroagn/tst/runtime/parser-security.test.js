import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  csvParser,
  iniParser,
  tomlParser,
  yamlParser,
} from '../../src/index.js'

const parse = async (parser, input, type) => parser.parser(
  new Response(input),
  {},
  type,
)

describe('Parser security', () => {
  it('rejects prototype-related INI keys and sections', async () => {
    await assert.rejects(() => parse(iniParser(), '[__proto__]\nkey=value', 'ini'))
    await assert.rejects(() => parse(iniParser(), 'constructor=value', 'ini'))
  })

  it('rejects prototype-related TOML paths and inline keys', async () => {
    await assert.rejects(() => parse(
      tomlParser(),
      '[constructor.prototype]\nkey = "value"',
      'toml',
    ))
    await assert.rejects(() => parse(
      tomlParser(),
      'table = { __proto__ = "value" }',
      'toml',
    ))
  })

  it('rejects prototype-related YAML and CSV keys', async () => {
    await assert.rejects(() => parse(yamlParser(), '__proto__: value', 'yaml'))
    await assert.rejects(() => parse(
      csvParser({ hasHeaders: true }),
      'prototype,value\nunsafe,data',
      'csv',
    ))
    assert.strictEqual(Object.prototype.polluted, undefined)
    assert.strictEqual(Array.prototype.polluted, undefined)
  })
})
