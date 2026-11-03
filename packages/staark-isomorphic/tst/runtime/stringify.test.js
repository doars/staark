import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    node,
    stringify,
    stringifyFull,
    stringifyPatch,
    stringifyPatchFull,
} from '../../src/index.js'

describe('Stringify', () => {
  it('stringify should render node to HTML string and abstract tree', () => {
    const [rendered, abstractTree] = stringify(
      () => node('h1', 'Hello world'),
    )
    assert.strictEqual(rendered, '<h1>Hello world</h1>')
    assert.notStrictEqual(abstractTree, undefined)
    assert.strictEqual(abstractTree[0].t, 'h1')
    assert.deepStrictEqual(abstractTree[0].c, ['Hello world'])
  })

  it('stringifyPatch should render abstract tree to HTML string and return abstract tree', () => {
    const [rendered, abstractTree] = stringifyPatch(
      node('h1', 'hello world'),
    )
    assert.strictEqual(rendered, '<h1>hello world</h1>')
    assert.notStrictEqual(abstractTree, undefined)
    assert.strictEqual(abstractTree[0].t, 'h1')
    assert.deepStrictEqual(abstractTree[0].c, ['hello world'])
  })

  it('stringifyFull should render view function to HTML string, abstract tree string, and state string', () => {
    const [rendered, abstractTreeString, stateString] = stringifyFull(
      () => node('h1', {
        title: 'Greeting',
      }, 'hello "world"'),
      {
        count: 2,
        enabled: true,
      },
    )
    assert.strictEqual(rendered, '<h1 title="Greeting">hello "world"</h1>')
    assert.deepStrictEqual(JSON.parse(abstractTreeString), [{
      a: {
        title: 'Greeting',
      },
      c: ['hello "world"'],
      t: 'h1',
    }])
    assert.deepStrictEqual(JSON.parse(stateString), {
      count: 2,
      enabled: true,
    })
  })

  it('stringifyPatchFull should render abstract tree to HTML string and abstract tree string', () => {
    const [rendered, abstractTreeString] = stringifyPatchFull(
      node('h1', 'hello world'),
    )
    assert.strictEqual(rendered, '<h1>hello world</h1>')
    assert.deepStrictEqual(JSON.parse(abstractTreeString), [{
      c: ['hello world'],
      t: 'h1',
    }])
  })

  it('escapes text and attribute values in both stringify paths', () => {
    const abstractTree = node(
      'custom-element',
      {
        'aria-label': `"' & < >`,
        'xlink:href': `javascript:alert('unsafe')`,
      },
      '<script>alert("unsafe")</script> & text',
    )
    const expected = '<custom-element aria-label="&quot;&#39; &amp; &lt; &gt;" xlink:href="javascript:alert(&#39;unsafe&#39;)">&lt;script&gt;alert("unsafe")&lt;/script&gt; &amp; text</custom-element>'

    assert.strictEqual(stringify(() => abstractTree)[0], expected)
    assert.strictEqual(stringifyPatch(abstractTree)[0], expected)
  })

  it('rejects unsafe element and attribute names', () => {
    assert.throws(
      () => stringifyPatch(node('div><script', 'unsafe')),
      /Invalid element name/,
    )
    assert.throws(
      () => stringifyPatch(node('div', {
        'title" onmouseover="alert(1)': 'unsafe',
      })),
      /Invalid attribute name/,
    )
  })

  it('renders only own class and style properties', () => {
    const classNames = Object.create({ inherited: true })
    classNames.visible = true
    const styles = Object.create({ backgroundImage: 'url(unsafe)' })
    styles.color = 'red'

    assert.strictEqual(
      stringifyPatch(node('svg', {
        class: classNames,
        style: styles,
        viewBox: '0 0 10 10',
      }))[0],
      '<svg class="visible" style="color:red" viewBox="0 0 10 10"></svg>',
    )
  })
})
