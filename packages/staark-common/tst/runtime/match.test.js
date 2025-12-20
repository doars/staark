import { describe, expect, it } from 'bun:test'

import {
    match,
} from '../../src/index.js'

describe('Match', () => {
  describe('match', () => {
    it('should return the value from lookup if key exists and is truthy', () => {
      const lookup = { a: 'value' }
      const result = match('a', lookup)
      expect(result).toEqual(['value'])
    })

    it('should return the fallback if key does not exist', () => {
      const lookup = { a: 'value' }
      const result = match('b', lookup, 'fallback')
      expect(result).toEqual(['fallback'])
    })

    it('should return the fallback if lookup[key] is falsy', () => {
      const lookup = { a: null }
      const result = match('a', lookup, 'fallback')
      expect(result).toEqual(['fallback'])
    })

    it('should call the function if result is a function', () => {
      const lookup = { a: () => 'called' }
      const result = match('a', lookup)
      expect(result).toEqual(['called'])
    })

    it('should call the fallback function if used', () => {
      const lookup = {}
      const result = match('a', lookup, () => 'fallback called')
      expect(result).toEqual(['fallback called'])
    })

    it('should arrayify the result', () => {
      const lookup = { a: ['already', 'array'] }
      const result = match('a', lookup)
      expect(result).toEqual(['already', 'array'])
    })

    it('should handle no lookup', () => {
      const result = match('a', null, 'fallback')
      expect(result).toEqual(['fallback'])
    })
  })
})
