import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    node,
} from '../../src/index.js'

describe('Node', () => {
  describe('node', () => {
    it('should create a node with type and attributes', () => {
      const result = node('div', { class: 'test' }, ['content'])
      assert.strictEqual(result.t, 'div')
      assert.deepStrictEqual(result.a, { class: 'test' })
      assert.deepStrictEqual(result.c, ['content'])
    })

    it('should handle contents as first arg if not object', () => {
      const result = node('p', 'text content')
      assert.strictEqual(result.a, undefined)
      assert.deepStrictEqual(result.c, ['text content'])
    })

    it('should keep zero and empty strings as contents', () => {
      assert.deepStrictEqual(node('p', 0).c, [0])
      assert.deepStrictEqual(node('p', '').c, [''])
      assert.deepStrictEqual(node('p', { id: 'a' }, 0).c, [0])
      assert.strictEqual(node('p', 0).a, undefined)
      assert.strictEqual(node('p', false).c, undefined)
      assert.strictEqual(node('p', null).c, undefined)
    })

    it('should arrayify contents', () => {
      const result = node('span', { id: 'test' }, 'single')
      assert.deepStrictEqual(result.c, ['single'])
    })

    it('should handle no attributes or contents', () => {
      const result = node('br')
      assert.strictEqual(result.a, undefined)
      assert.strictEqual(result.c, undefined)
    })

    it('should distinguish attributes from contents based on type', () => {
      // If second arg is array, treat as contents
      const result = node('ul', ['item1', 'item2'])
      assert.strictEqual(result.a, undefined)
      assert.deepStrictEqual(result.c, ['item1', 'item2'])
    })
  })
})
