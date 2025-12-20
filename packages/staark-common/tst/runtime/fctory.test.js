import { describe, expect, it } from 'bun:test'

import {
    fctory,
} from '../../src/fctory.js'

describe('Fctory', () => {
  describe('fctory proxy', () => {
    it('should create a function for a given type', () => {
      const divFctory = fctory.div
      expect(typeof divFctory).toBe('function')
    })

    it('should cache the created function', () => {
      const divFctory1 = fctory.div
      const divFctory2 = fctory.div
      expect(divFctory1).toBe(divFctory2)
    })

    it('should convert camelCase to kebab-case', () => {
      const customElementFctory = fctory.customElement
      expect(typeof customElementFctory).toBe('function')
    })

    it('should parse selector and create node with attributes', () => {
      const divFctory = fctory.div
      const result = divFctory('#myId.myClass', ['content'])
      expect(result.t).toBe('div')
      expect(result.a).toEqual({ id: 'myId', class: 'myClass' })
      expect(result.c).toEqual(['content'])
    })

    it('should handle no selector', () => {
      const divFctory = fctory.div
      const result = divFctory(undefined, ['content'])
      expect(result.t).toBe('div')
      expect(result.a).toBeUndefined()
      expect(result.c).toEqual(['content'])
    })
  })
})
