import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  csvParser,
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

  it('parses CSV with CRLF line endings', async () => {
    const result = await parse(csvParser(), 'a,b\r\n1,2\r\n', 'csv')

    assert.deepStrictEqual(result, [['a', 'b'], ['1', '2']])
  })

  it('keeps an empty last CSV field', async () => {
    const result = await parse(csvParser(), 'a,b,\n1,2,', 'csv')

    assert.deepStrictEqual(result, [['a', 'b', ''], ['1', '2', '']])
  })

  it('keeps CRLF inside a quoted CSV field', async () => {
    const result = await parse(csvParser(), '"a\r\nb",c\r\n', 'csv')

    assert.deepStrictEqual(result, [['a\r\nb', 'c']])
  })
})

describe('TOML parser', () => {
  it('parses multi-line strings into the right key', async () => {
    const result = await parse(
      tomlParser(),
      'a = 1\nb = """abc\n  def\n\n# kept\n"""\nc = """\nhi\n"""\n',
      'toml',
    )

    assert.deepStrictEqual({ ...result }, {
      a: 1,
      b: 'abc\n  def\n\n# kept\n',
      c: 'hi\n',
    })
  })

  it('joins lines ending in a backslash in basic multi-line strings only', async () => {
    const result = await parse(
      tomlParser(),
      'a = """one \\\n    two"""\nb = \'\'\'one \\\ntwo\'\'\'\n',
      'toml',
    )

    assert.strictEqual(result.a, 'one two')
    assert.strictEqual(result.b, 'one \\\ntwo')
  })

  it('keeps quoted strings in inline tables', async () => {
    const result = await parse(
      tomlParser(),
      't = { s = "1", b = "true", n = 2 }\n',
      'toml',
    )

    assert.deepStrictEqual({ ...result.t }, { s: '1', b: 'true', n: 2 })
  })

  it('removes trailing comments outside of quotes', async () => {
    const result = await parse(
      tomlParser(),
      'a = 1 # c\nb = "x # y" # z\n[t] # c\nc = [\n  1, # one\n  2,\n]\n',
      'toml',
    )

    assert.strictEqual(result.a, 1)
    assert.strictEqual(result.b, 'x # y')
    assert.deepStrictEqual([...result.t.c], [1, 2])
  })

  it('throws on a key without a value', async () => {
    await assert.rejects(parse(tomlParser(), 'a =\n', 'toml'), SyntaxError)
  })
})
