import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    arrayify,
    arrayifyOrUndefined,
} from '../../src/index.js'

describe('Array', () => {
  describe('arrayify', () => {
    it('should return the array if data is already an array', () => {
      const data = [1, 2, 3]
      const result = arrayify(data)
      assert.deepStrictEqual(result, [1, 2, 3])
      assert.strictEqual(result, data)
    })

    it('should wrap non-array data in an array', () => {
      const result = arrayify('test')
      assert.deepStrictEqual(result, ['test'])
    })

    it('should return empty array for falsy values', () => {
      assert.deepStrictEqual(arrayify(null), [])
      assert.deepStrictEqual(arrayify(undefined), [])
      assert.deepStrictEqual(arrayify(false), [])
      assert.deepStrictEqual(arrayify(0), [])
      assert.deepStrictEqual(arrayify(''), [])
    })
  })

  describe('arrayifyOrUndefined', () => {
    it('should return the array if data is already an array', () => {
      const data = [1, 2, 3]
      const result = arrayifyOrUndefined(data)
      assert.deepStrictEqual(result, [1, 2, 3])
      assert.strictEqual(result, data)
    })

    it('should wrap non-array data in an array', () => {
      const result = arrayifyOrUndefined('test')
      assert.deepStrictEqual(result, ['test'])
    })

    it('should return undefined for falsy values', () => {
      assert.strictEqual(arrayifyOrUndefined(null), undefined)
      assert.strictEqual(arrayifyOrUndefined(undefined), undefined)
      assert.strictEqual(arrayifyOrUndefined(false), undefined)
      assert.strictEqual(arrayifyOrUndefined(0), undefined)
      assert.strictEqual(arrayifyOrUndefined(''), undefined)
    })
  })
})
