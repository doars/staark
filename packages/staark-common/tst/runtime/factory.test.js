import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    factory,
} from '../../src/index.js'

describe('Factory', () => {
  describe('factory proxy', () => {
    it('should create a function for a given type', () => {
      const divFactory = factory.div
      assert.strictEqual(typeof divFactory, 'function')
    })

    it('should cache the created function', () => {
      const divFactory1 = factory.div
      const divFactory2 = factory.div
      assert.strictEqual(divFactory1, divFactory2)
    })

    it('should convert camelCase to kebab-case', () => {
      const customElementFactory = factory.customElement
      assert.strictEqual(typeof customElementFactory, 'function')
    })

    it('should call node with correct arguments when factory function is called', () => {
      const divFactory = factory.div
      const result = divFactory({ class: 'test' }, ['content'])
      assert.strictEqual(result.t, 'div')
      assert.deepStrictEqual(result.a, { class: 'test' })
      assert.deepStrictEqual(result.c, ['content'])
    })
  })
})
