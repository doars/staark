import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    equalRecursive,
} from '../../src/index.js'

describe('Compare', () => {
  describe('equalRecursive', () => {
    it('should return true for identical primitives', () => {
      assert.strictEqual(equalRecursive(42, 42), true)
      assert.strictEqual(equalRecursive('test', 'test'), true)
      assert.strictEqual(equalRecursive(true, true), true)
      assert.strictEqual(equalRecursive(null, null), true)
      assert.strictEqual(equalRecursive(undefined, undefined), true)
    })

    it('should return false for different primitives', () => {
      assert.strictEqual(equalRecursive(42, 43), false)
      assert.strictEqual(equalRecursive('test', 'other'), false)
      assert.strictEqual(equalRecursive(true, false), false)
    })

    it('should return true for equal arrays', () => {
      assert.strictEqual(equalRecursive([1, 2, 3], [1, 2, 3]), true)
    })

    it('should return false for different arrays', () => {
      assert.strictEqual(equalRecursive([1, 2, 3], [1, 2, 4]), false)
      assert.strictEqual(equalRecursive([1, 2], [1, 2, 3]), false)
    })

    it('should return true for equal objects', () => {
      assert.strictEqual(equalRecursive({ a: 1, b: 2 }, { a: 1, b: 2 }), true)
    })

    it('should return false for different objects', () => {
      assert.strictEqual(equalRecursive({ a: 1, b: 2 }, { a: 1, b: 3 }), false)
      assert.strictEqual(equalRecursive({ a: 1 }, { a: 1, b: 2 }), false)
    })

    it('should handle nested structures', () => {
      const obj1 = { arr: [1, { nested: 'value' }], num: 42 }
      const obj2 = { arr: [1, { nested: 'value' }], num: 42 }
      assert.strictEqual(equalRecursive(obj1, obj2), true)
    })

    it('should return false for nested differences', () => {
      const obj1 = { arr: [1, { nested: 'value' }] }
      const obj2 = { arr: [1, { nested: 'other' }] }
      assert.strictEqual(equalRecursive(obj1, obj2), false)
    })

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-01-01')
      assert.strictEqual(equalRecursive(date1, date2), true)
      const date3 = new Date('2023-01-02')
      assert.strictEqual(equalRecursive(date1, date3), false)
    })

    it('should return false for Date vs non-Date', () => {
      assert.strictEqual(equalRecursive(new Date(), '2023-01-01'), false)
    })

    it('compares equal and unequal circular graphs', () => {
      const valueA = { value: true }
      const valueB = { value: true }
      valueA.self = valueA
      valueB.self = valueB
      assert.strictEqual(equalRecursive(valueA, valueB), true)

      valueB.value = false
      assert.strictEqual(equalRecursive(valueA, valueB), false)
    })
  })
})
