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

    it('should return empty array for null, undefined, and false', () => {
      assert.deepStrictEqual(arrayify(null), [])
      assert.deepStrictEqual(arrayify(undefined), [])
      assert.deepStrictEqual(arrayify(false), [])
    })

    it('should wrap other falsy values', () => {
      assert.deepStrictEqual(arrayify(0), [0])
      assert.deepStrictEqual(arrayify(''), [''])
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

    it('should return undefined for null, undefined, and false', () => {
      assert.strictEqual(arrayifyOrUndefined(null), undefined)
      assert.strictEqual(arrayifyOrUndefined(undefined), undefined)
      assert.strictEqual(arrayifyOrUndefined(false), undefined)
    })

    it('should wrap other falsy values', () => {
      assert.deepStrictEqual(arrayifyOrUndefined(0), [0])
      assert.deepStrictEqual(arrayifyOrUndefined(''), [''])
    })
  })
})
