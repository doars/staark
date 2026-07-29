import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    conditional,
} from '../../src/index.js'

describe('Conditional', () => {
  it('should return true branch when condition is true', () => {
    const result = conditional(true, ['true'], ['false'])
    assert.deepStrictEqual(result, ['true'])
  })

  it('should return false branch when condition is false', () => {
    const result = conditional(false, ['true'], ['false'])
    assert.deepStrictEqual(result, ['false'])
  })

  it('should return true branch when condition is true as an array', () => {
    const result = conditional(true, 'true', 'false')
    assert.deepStrictEqual(result, ['true'])
  })

  it('should return false branch when condition is false as an array', () => {
    const result = conditional(false, 'true', 'false')
    assert.deepStrictEqual(result, ['false'])
  })
})
