import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    match,
} from '../../src/index.js'

describe('Match', () => {
  describe('match', () => {
    it('should return the value from lookup if key exists and is truthy', () => {
      const lookup = { a: 'value' }
      const result = match('a', lookup)
      assert.deepStrictEqual(result, ['value'])
    })

    it('should return the fallback if key does not exist', () => {
      const lookup = { a: 'value' }
      const result = match('b', lookup, 'fallback')
      assert.deepStrictEqual(result, ['fallback'])
    })

    it('should return the fallback if lookup[key] is falsy', () => {
      const lookup = { a: null }
      const result = match('a', lookup, 'fallback')
      assert.deepStrictEqual(result, ['fallback'])
    })

    it('should call the function if result is a function', () => {
      const lookup = { a: () => 'called' }
      const result = match('a', lookup)
      assert.deepStrictEqual(result, ['called'])
    })

    it('should call the fallback function if used', () => {
      const lookup = {}
      const result = match('a', lookup, () => 'fallback called')
      assert.deepStrictEqual(result, ['fallback called'])
    })

    it('should arrayify the result', () => {
      const lookup = { a: ['already', 'array'] }
      const result = match('a', lookup)
      assert.deepStrictEqual(result, ['already', 'array'])
    })

    it('should handle no lookup', () => {
      const result = match('a', null, 'fallback')
      assert.deepStrictEqual(result, ['fallback'])
    })
  })
})
