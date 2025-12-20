import { describe, expect, it } from 'bun:test'

import {
    identifier,
} from '../../src/index.js'

describe('Identifier', () => {
  describe('identifier', () => {
    it('should generate unique identifiers with prefix', () => {
      const id1 = identifier('test')
      const id2 = identifier('test')
      expect(id1).toMatch(/^test-\d+$/)
      expect(id2).toMatch(/^test-\d+$/)
      expect(id1).not.toBe(id2)
    })

    it('should increment the counter', () => {
      const id1 = identifier('prefix')
      const id2 = identifier('prefix')
      const num1 = parseInt(id1.split('-')[1])
      const num2 = parseInt(id2.split('-')[1])
      expect(num2).toBe(num1 + 1)
    })

    it('should handle different prefixes', () => {
      const id1 = identifier('a')
      const id2 = identifier('b')
      expect(id1).toMatch(/^a-\d+$/)
      expect(id2).toMatch(/^b-\d+$/)
    })
  })
})
