import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    nde,
} from '../../src/index.js'

describe('Nde', () => {
  describe('nde', () => {
    it('should create a node from a simple type selector', () => {
      const result = nde('div', ['content'])
      assert.strictEqual(result.t, 'div')
      assert.deepStrictEqual(result.a, {})
      assert.deepStrictEqual(result.c, ['content'])
    })

    it('should parse attributes from selector', () => {
      const result = nde('span#myId.myClass', ['text'])
      console.log(result)
      assert.strictEqual(result.t, 'span')
      assert.deepStrictEqual(result.a, { id: 'myId', class: 'myClass' })
      assert.deepStrictEqual(result.c, ['text'])
    })

    it('should handle selector with no type', () => {
      const result = nde('#id.class', ['content'])
      assert.strictEqual(result.t, '')
      assert.deepStrictEqual(result.a, { id: 'id', class: 'class' })
    })

    it('should arrayify contents', () => {
      const result = nde('p', 'single content')
      assert.deepStrictEqual(result.c, ['single content'])
    })

    it('should handle no contents', () => {
      const result = nde('br')
      assert.strictEqual(result.c, undefined)
    })
  })
})
