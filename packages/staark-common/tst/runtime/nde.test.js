import { describe, expect, it } from 'bun:test'

import {
    nde,
} from '../../src/index.js'

describe('Nde', () => {
  describe('nde', () => {
    it('should create a node from a simple type selector', () => {
      const result = nde('div', ['content'])
      expect(result.t).toBe('div')
      expect(result.a).toEqual({})
      expect(result.c).toEqual(['content'])
    })

    it('should parse attributes from selector', () => {
      const result = nde('span#myId.myClass', ['text'])
      console.log(result)
      expect(result.t).toBe('span')
      expect(result.a).toEqual({ id: 'myId', class: 'myClass' })
      expect(result.c).toEqual(['text'])
    })

    it('should handle selector with no type', () => {
      const result = nde('#id.class', ['content'])
      expect(result.t).toBe('')
      expect(result.a).toEqual({ id: 'id', class: 'class' })
    })

    it('should arrayify contents', () => {
      const result = nde('p', 'single content')
      expect(result.c).toEqual(['single content'])
    })

    it('should handle no contents', () => {
      const result = nde('br')
      expect(result.c).toBeUndefined()
    })
  })
})
