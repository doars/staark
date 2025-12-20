import { describe, expect, it } from 'bun:test'

import {
    memo,
} from '../../src/index.js'

describe('Memo', () => {
  describe('memo', () => {
    it('should create a memo object with correct properties', () => {
      const render = () => 'rendered'
      const memory = 'data'
      const result = memo(render, memory)
      expect(result.r).toBe(render)
      expect(result.m).toBe(memory)
    })

    it('should handle different render functions and memory', () => {
      const render = (state) => state.value
      const memory = { key: 'value' }
      const result = memo(render, memory)
      expect(result.r).toBe(render)
      expect(result.m).toEqual({ key: 'value' })
    })
  })
})
