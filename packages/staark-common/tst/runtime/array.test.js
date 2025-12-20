import { describe, expect, it } from 'bun:test'

import {
    arrayify,
    arrayifyOrUndefined,
} from '../../src/index.js'

describe('Array', () => {
  describe('arrayify', () => {
    it('should return the array if data is already an array', () => {
      const data = [1, 2, 3]
      const result = arrayify(data)
      expect(result).toEqual([1, 2, 3])
      expect(result).toBe(data)
    })

    it('should wrap non-array data in an array', () => {
      const result = arrayify('test')
      expect(result).toEqual(['test'])
    })

    it('should return empty array for falsy values', () => {
      expect(arrayify(null)).toEqual([])
      expect(arrayify(undefined)).toEqual([])
      expect(arrayify(false)).toEqual([])
      expect(arrayify(0)).toEqual([])
      expect(arrayify('')).toEqual([])
    })
  })

  describe('arrayifyOrUndefined', () => {
    it('should return the array if data is already an array', () => {
      const data = [1, 2, 3]
      const result = arrayifyOrUndefined(data)
      expect(result).toEqual([1, 2, 3])
      expect(result).toBe(data)
    })

    it('should wrap non-array data in an array', () => {
      const result = arrayifyOrUndefined('test')
      expect(result).toEqual(['test'])
    })

    it('should return undefined for falsy values', () => {
      expect(arrayifyOrUndefined(null)).toBeUndefined()
      expect(arrayifyOrUndefined(undefined)).toBeUndefined()
      expect(arrayifyOrUndefined(false)).toBeUndefined()
      expect(arrayifyOrUndefined(0)).toBeUndefined()
      expect(arrayifyOrUndefined('')).toBeUndefined()
    })
  })
})
