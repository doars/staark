import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    cloneRecursive,
} from '../../src/index.js'

describe('Clone', () => {
  describe('cloneRecursive', () => {
    it('should return primitive values as is', () => {
      assert.strictEqual(cloneRecursive(42), 42)
      assert.strictEqual(cloneRecursive('test'), 'test')
      assert.strictEqual(cloneRecursive(true), true)
      assert.strictEqual(cloneRecursive(null), null)
      assert.strictEqual(cloneRecursive(undefined), undefined)
    })

    it('should clone arrays shallowly if no nested objects', () => {
      const original = [1, 2, 3]
      const cloned = cloneRecursive(original)
      assert.deepStrictEqual(cloned, [1, 2, 3])
      assert.notStrictEqual(cloned, original)
    })

    it('should clone objects shallowly if no nested objects', () => {
      const original = { a: 1, b: 2 }
      const cloned = cloneRecursive(original)
      assert.deepStrictEqual(cloned, { a: 1, b: 2 })
      assert.notStrictEqual(cloned, original)
    })

    it('should clone arrays deeply', () => {
      const original = [1, [2, 3], 4]
      const cloned = cloneRecursive(original)
      assert.deepStrictEqual(cloned, [1, [2, 3], 4])
      assert.notStrictEqual(cloned, original)
      assert.notStrictEqual(cloned[1], original[1])
    })

    it('should clone objects deeply', () => {
      const original = { a: 1, b: { c: 2 } }
      const cloned = cloneRecursive(original)
      assert.deepStrictEqual(cloned, { a: 1, b: { c: 2 } })
      assert.notStrictEqual(cloned, original)
      assert.notStrictEqual(cloned.b, original.b)
    })

    it('should handle mixed nested structures', () => {
      const original = { arr: [1, { obj: 'value' }], num: 42 }
      const cloned = cloneRecursive(original)
      assert.deepStrictEqual(cloned, { arr: [1, { obj: 'value' }], num: 42 })
      assert.notStrictEqual(cloned.arr, original.arr)
      assert.notStrictEqual(cloned.arr[1], original.arr[1])
    })

    it('preserves cycles and shared references without inherited properties', () => {
      const value = Object.create({ inherited: true })
      const child = { value: true }
      value.first = child
      value.second = child
      value.self = value

      const cloned = cloneRecursive(value)
      assert.strictEqual(cloned.self, cloned)
      assert.strictEqual(cloned.first, cloned.second)
      assert.strictEqual(Object.hasOwn(cloned, 'inherited'), false)
    })

    it('clones DataView values and their visible byte range', () => {
      const buffer = new Uint8Array([0, 1, 2, 3]).buffer
      const original = new DataView(buffer, 1, 2)
      const cloned = cloneRecursive(original)

      assert.ok(cloned instanceof DataView)
      assert.notStrictEqual(cloned, original)
      assert.notStrictEqual(cloned.buffer, original.buffer)
      assert.strictEqual(cloned.byteLength, 2)
      assert.strictEqual(cloned.getUint8(0), 1)
      assert.strictEqual(cloned.getUint8(1), 2)
    })
  })
})
