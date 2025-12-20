import { describe, expect, it } from 'bun:test'

import {
    cloneRecursive,
} from '../../src/index.js'

describe('Clone', () => {
  describe('cloneRecursive', () => {
    it('should return primitive values as is', () => {
      expect(cloneRecursive(42)).toBe(42)
      expect(cloneRecursive('test')).toBe('test')
      expect(cloneRecursive(true)).toBe(true)
      expect(cloneRecursive(null)).toBe(null)
      expect(cloneRecursive(undefined)).toBe(undefined)
    })

    it('should clone arrays shallowly if no nested objects', () => {
      const original = [1, 2, 3]
      const cloned = cloneRecursive(original)
      expect(cloned).toEqual([1, 2, 3])
      expect(cloned).not.toBe(original)
    })

    it('should clone objects shallowly if no nested objects', () => {
      const original = { a: 1, b: 2 }
      const cloned = cloneRecursive(original)
      expect(cloned).toEqual({ a: 1, b: 2 })
      expect(cloned).not.toBe(original)
    })

    it('should clone arrays deeply', () => {
      const original = [1, [2, 3], 4]
      const cloned = cloneRecursive(original)
      expect(cloned).toEqual([1, [2, 3], 4])
      expect(cloned).not.toBe(original)
      expect(cloned[1]).not.toBe(original[1])
    })

    it('should clone objects deeply', () => {
      const original = { a: 1, b: { c: 2 } }
      const cloned = cloneRecursive(original)
      expect(cloned).toEqual({ a: 1, b: { c: 2 } })
      expect(cloned).not.toBe(original)
      expect(cloned.b).not.toBe(original.b)
    })

    it('should handle mixed nested structures', () => {
      const original = { arr: [1, { obj: 'value' }], num: 42 }
      const cloned = cloneRecursive(original)
      expect(cloned).toEqual({ arr: [1, { obj: 'value' }], num: 42 })
      expect(cloned.arr).not.toBe(original.arr)
      expect(cloned.arr[1]).not.toBe(original.arr[1])
    })
  })
})
