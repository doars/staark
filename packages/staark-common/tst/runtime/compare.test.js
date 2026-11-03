import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    clonePlain,
  equalPlain,
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

    it('compares DataView values by constructor and visible bytes', () => {
      const valueA = new DataView(new Uint8Array([0, 1, 2]).buffer, 1)
      const valueB = new DataView(new Uint8Array([1, 2]).buffer)
      const valueC = new DataView(new Uint8Array([1, 3]).buffer)

      assert.strictEqual(equalRecursive(valueA, valueB), true)
      assert.strictEqual(equalRecursive(valueA, valueC), false)
      assert.strictEqual(equalRecursive(valueA, new Uint8Array([1, 2])), false)
    })
  })

  describe('clonePlain', () => {
    it('copies plain data so it stays equal to the original contents', () => {
      const original = { list: [1, { a: 2 }], date: new Date(5), empty: Object.create(null) }
      const copy = clonePlain(original)
      assert.notStrictEqual(copy, original)
      assert.notStrictEqual(copy.list, original.list)
      assert.strictEqual(equalPlain(copy, original), true)
      original.list[1].a = 3
      original.date.setTime(6)
      assert.strictEqual(copy.list[1].a, 2)
      assert.strictEqual(copy.date.getTime(), 5)
      assert.strictEqual(equalPlain(copy, original), false)
    })

    it('keeps other objects by reference', () => {
      const map = new Map()
      class Point { constructor(x) { this.x = x } }
      const point = new Point(1)
      const copy = clonePlain({ map, point })
      assert.strictEqual(copy.map, map)
      assert.strictEqual(copy.point, point)
    })

    it('handles primitives and circular structures', () => {
      assert.strictEqual(clonePlain(1), 1)
      assert.strictEqual(clonePlain(null), null)
      const circular = { value: 1 }
      circular.self = circular
      const copy = clonePlain(circular)
      assert.strictEqual(copy.value, 1)
      assert.strictEqual(copy.self, circular)
      circular.value = 2
      assert.strictEqual(equalPlain(copy, circular), false)
    })
  })

  describe('equalPlain', () => {
    it('compares primitives, arrays, plain objects and dates by content', () => {
      assert.strictEqual(equalPlain(1, 1), true)
      assert.strictEqual(equalPlain(1, '1'), false)
      assert.strictEqual(equalPlain(null, undefined), false)
      assert.strictEqual(equalPlain([1, { a: [2] }], [1, { a: [2] }]), true)
      assert.strictEqual(equalPlain([1, { a: [2] }], [1, { a: [3] }]), false)
      assert.strictEqual(equalPlain({ a: 1 }, { a: 1, b: 2 }), false)
      assert.strictEqual(equalPlain({ a: undefined }, { b: undefined }), false)
      assert.strictEqual(equalPlain([1], { 0: 1 }), false)
      assert.strictEqual(equalPlain(new Date(5), new Date(5)), true)
      assert.strictEqual(equalPlain(new Date(5), new Date(6)), false)
      assert.strictEqual(equalPlain(Object.create(null), Object.create(null)), true)
    })

    it('compares other objects by identity', () => {
      const map = new Map([[1, 2]])
      assert.strictEqual(equalPlain(map, map), true)
      assert.strictEqual(equalPlain(map, new Map([[1, 2]])), false)
      assert.strictEqual(equalPlain(new Map([[1, 2]]), new Map([[3, 4]])), false)
      assert.strictEqual(equalPlain(new Set([1]), new Set([2])), false)
      class Point { constructor(x) { this.x = x } }
      assert.strictEqual(equalPlain(new Point(1), new Point(1)), false)
    })

    it('treats circular structures as unequal without overflowing', () => {
      const a = { value: 1 }
      a.self = a
      const b = { value: 1 }
      b.self = b
      assert.strictEqual(equalPlain(a, b), false)
      assert.strictEqual(equalPlain(a, a), true)
    })

    it('compares shared references that are not circular', () => {
      const shared = { x: 1 }
      assert.strictEqual(equalPlain({ a: shared, b: shared }, { a: { x: 1 }, b: { x: 1 } }), true)
    })
  })
})
