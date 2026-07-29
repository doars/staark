import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    match,
} from '../../src/index.js'

describe('Match', () => {
  it('should return matching value', () => {
    const result = match('option-1', {
      'option-1': ['option-1',],
      'option-2': ['option-2',],
      'option-3': ['option-3',],
    })
    assert.deepStrictEqual(result, ['option-1'])
  })

  it('should return another matching value', () => {
    const result = match('option-2', {
      'option-1': ['option-1',],
      'option-2': ['option-2',],
      'option-3': ['option-3',],
    })
    assert.deepStrictEqual(result, ['option-2'])
  })

  it('should return fallback when key not found', () => {
    const result = match('option-2', {
      'option-1': ['option-1',],
    }, ['fallback',])
    assert.deepStrictEqual(result, ['fallback'])
  })

  it('should return matching value as an array', () => {
    const result = match('option-1', {
      'option-1': 'option-1',
      'option-2': 'option-2',
      'option-3': 'option-3',
    })
    assert.deepStrictEqual(result, ['option-1'])
  })

  it('should return another matching value as an array', () => {
    const result = match('option-2', {
      'option-1': 'option-1',
      'option-2': 'option-2',
      'option-3': 'option-3',
    })
    assert.deepStrictEqual(result, ['option-2'])
  })

  it('should return fallback when nothing matches as an array', () => {
    const result = match('option-2', {
      'option-1': ['option-1',],
    }, 'fallback')
    assert.deepStrictEqual(result, ['fallback'])
  })

  it('should handle function values', () => {
    const result = match('key', {
      'key': () => 'function result',
    })
    assert.deepStrictEqual(result, ['function result'])
  })
})
