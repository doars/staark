import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    identifier,
} from '../../src/index.js'

describe('Identifier', () => {
  describe('identifier', () => {
    it('should generate unique identifiers with prefix', () => {
      const id1 = identifier('test')
      const id2 = identifier('test')
      assert.match(id1, /^test-\d+$/)
      assert.match(id2, /^test-\d+$/)
      assert.notStrictEqual(id1, id2)
    })

    it('should increment the counter', () => {
      const id1 = identifier('prefix')
      const id2 = identifier('prefix')
      const num1 = parseInt(id1.split('-')[1])
      const num2 = parseInt(id2.split('-')[1])
      assert.strictEqual(num2, num1 + 1)
    })

    it('should handle different prefixes', () => {
      const id1 = identifier('a')
      const id2 = identifier('b')
      assert.match(id1, /^a-\d+$/)
      assert.match(id2, /^b-\d+$/)
    })
  })
})
