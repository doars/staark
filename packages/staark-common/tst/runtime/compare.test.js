import { describe, expect, it } from 'bun:test'

import {
    equalRecursive,
} from '../../src/index.js'

describe('Compare', () => {
  describe('equalRecursive', () => {
    it('should return true for identical primitives', () => {
      expect(equalRecursive(42, 42)).toBe(true)
      expect(equalRecursive('test', 'test')).toBe(true)
      expect(equalRecursive(true, true)).toBe(true)
      expect(equalRecursive(null, null)).toBe(true)
      expect(equalRecursive(undefined, undefined)).toBe(true)
    })

    it('should return false for different primitives', () => {
      expect(equalRecursive(42, 43)).toBe(false)
      expect(equalRecursive('test', 'other')).toBe(false)
      expect(equalRecursive(true, false)).toBe(false)
    })

    it('should return true for equal arrays', () => {
      expect(equalRecursive([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    it('should return false for different arrays', () => {
      expect(equalRecursive([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(equalRecursive([1, 2], [1, 2, 3])).toBe(false)
    })

    it('should return true for equal objects', () => {
      expect(equalRecursive({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    })

    it('should return false for different objects', () => {
      expect(equalRecursive({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(equalRecursive({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('should handle nested structures', () => {
      const obj1 = { arr: [1, { nested: 'value' }], num: 42 }
      const obj2 = { arr: [1, { nested: 'value' }], num: 42 }
      expect(equalRecursive(obj1, obj2)).toBe(true)
    })

    it('should return false for nested differences', () => {
      const obj1 = { arr: [1, { nested: 'value' }] }
      const obj2 = { arr: [1, { nested: 'other' }] }
      expect(equalRecursive(obj1, obj2)).toBe(false)
    })

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-01-01')
      expect(equalRecursive(date1, date2)).toBe(true)
      const date3 = new Date('2023-01-02')
      expect(equalRecursive(date1, date3)).toBe(false)
    })

    it('should return false for Date vs non-Date', () => {
      expect(equalRecursive(new Date(), '2023-01-01')).toBe(false)
    })
  })
})
