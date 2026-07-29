import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    fctory,
} from '../../src/fctory.js'

describe('Fctory', () => {
  describe('fctory proxy', () => {
    it('should create a function for a given type', () => {
      const divFctory = fctory.div
      assert.strictEqual(typeof divFctory, 'function')
    })

    it('should cache the created function', () => {
      const divFctory1 = fctory.div
      const divFctory2 = fctory.div
      assert.strictEqual(divFctory1, divFctory2)
    })

    it('should convert camelCase to kebab-case', () => {
      const customElementFctory = fctory.customElement
      assert.strictEqual(typeof customElementFctory, 'function')
    })

    it('should parse selector and create node with attributes', () => {
      const divFctory = fctory.div
      const result = divFctory('#myId.myClass', ['content'])
      assert.strictEqual(result.t, 'div')
      assert.deepStrictEqual(result.a, { id: 'myId', class: 'myClass' })
      assert.deepStrictEqual(result.c, ['content'])
    })

    it('should handle no selector', () => {
      const divFctory = fctory.div
      const result = divFctory(undefined, ['content'])
      assert.strictEqual(result.t, 'div')
      assert.strictEqual(result.a, undefined)
      assert.deepStrictEqual(result.c, ['content'])
    })
  })
})
