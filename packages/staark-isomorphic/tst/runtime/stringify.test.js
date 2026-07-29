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
    assert.strictEqual(rendered, '<h1> Hello world </h1>')
    assert.notStrictEqual(abstractTree, undefined)
    assert.strictEqual(abstractTree[0].t, 'h1')
    assert.deepStrictEqual(abstractTree[0].c, ['Hello world'])
  })

  it('stringifyPatch should render abstract tree to HTML string and return abstract tree', () => {
    const [rendered, abstractTree] = stringifyPatch(
      node('h1', 'hello world'),
    )
    assert.strictEqual(rendered, '<h1> hello world </h1>')
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
    assert.strictEqual(rendered, '<h1 title="Greeting"> hello "world" </h1>')
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
    assert.strictEqual(rendered, '<h1> hello world </h1>')
    assert.deepStrictEqual(JSON.parse(abstractTreeString), [{
      a: null,
      c: ['hello world'],
      t: 'h1',
    }])
  })
})
