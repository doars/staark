import { describe, expect, it } from 'bun:test'

import {
    node,
} from '../../src/index.js'

describe('Node', () => {
  describe('node', () => {
    it('should create a node with type and attributes', () => {
      const result = node('div', { class: 'test' }, ['content'])
      expect(result.t).toBe('div')
      expect(result.a).toEqual({ class: 'test' })
      expect(result.c).toEqual(['content'])
    })

    it('should handle contents as first arg if not object', () => {
      const result = node('p', 'text content')
      expect(result.a).toBeUndefined()
      expect(result.c).toEqual(['text content'])
    })

    it('should arrayify contents', () => {
      const result = node('span', { id: 'test' }, 'single')
      expect(result.c).toEqual(['single'])
    })

    it('should handle no attributes or contents', () => {
      const result = node('br')
      expect(result.a).toBeUndefined()
      expect(result.c).toBeUndefined()
    })

    it('should distinguish attributes from contents based on type', () => {
      // If second arg is array, treat as contents
      const result = node('ul', ['item1', 'item2'])
      expect(result.a).toBeUndefined()
      expect(result.c).toEqual(['item1', 'item2'])
    })
  })
})
