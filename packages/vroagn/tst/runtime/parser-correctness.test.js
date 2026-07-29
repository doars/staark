import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  tomlParser,
  yamlParser,
} from '../../src/index.js'

const parse = (parser, text, type) => parser.parser(
  new Response(text),
  {},
  type,
)

describe('Parser correctness', () => {
  it('parses nested YAML separated by blank lines', async () => {
    const result = await parse(
      yamlParser(),
      'parent:\n  child: value\n\nafter: value\n',
      'yaml',
    )

    assert.strictEqual(result.parent.child, 'value')
    assert.strictEqual(result.after, 'value')
  })

  it('parses single-line and multiline TOML arrays', async () => {
    const result = await parse(
      tomlParser(),
      'single = [1, "two"]\nvalues = [\n  "one",\n  "two"\n]\n',
      'toml',
    )

    assert.deepStrictEqual([...result.single], [1, 'two'])
    assert.deepStrictEqual([...result.values], ['one', 'two'])
  })
})
