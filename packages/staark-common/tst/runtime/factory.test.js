import { describe, expect, it } from 'bun:test'

import {
    factory,
} from '../../src/index.js'

describe('Factory', () => {
  describe('factory proxy', () => {
    it('should create a function for a given type', () => {
      const divFactory = factory.div
      expect(typeof divFactory).toBe('function')
    })

    it('should cache the created function', () => {
      const divFactory1 = factory.div
      const divFactory2 = factory.div
      expect(divFactory1).toBe(divFactory2)
    })

    it('should convert camelCase to kebab-case', () => {
      const customElementFactory = factory.customElement
      expect(typeof customElementFactory).toBe('function')
    })

    it('should call node with correct arguments when factory function is called', () => {
      const divFactory = factory.div
      const result = divFactory({ class: 'test' }, ['content'])
      expect(result.t).toBe('div')
      expect(result.a).toEqual({ class: 'test' })
      expect(result.c).toEqual(['content'])
    })
  })
})
