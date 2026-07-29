import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    memo,
} from '../../src/index.js'

describe('Memo', () => {
  describe('memo', () => {
    it('should create a memo object with correct properties', () => {
      const render = () => 'rendered'
      const memory = 'data'
      const result = memo(render, memory)
      assert.strictEqual(result.r, render)
      assert.strictEqual(result.m, memory)
    })

    it('should handle different render functions and memory', () => {
      const render = (state) => state.value
      const memory = { key: 'value' }
      const result = memo(render, memory)
      assert.strictEqual(result.r, render)
      assert.deepStrictEqual(result.m, { key: 'value' })
    })
  })
})
