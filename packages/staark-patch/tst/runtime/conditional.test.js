import { describe, expect, it } from 'bun:test'

import {
  conditional,
} from '../../src/index.js'

describe('Conditional', () => {
  it('should return true branch when condition is true', () => {
    const result = conditional(true, ['true',], ['false',])
    expect(result).toEqual(['true'])
  })

  it('should return false branch when condition is false', () => {
    const result = conditional(false, ['true',], ['false',])
    expect(result).toEqual(['false'])
  })

  it('should return true branch when condition is true as an array', () => {
    const result = conditional(true, 'true', 'false')
    expect(result).toEqual(['true'])
  })

  it('should return false branch when condition is false as an array', () => {
    const result = conditional(false, 'true', 'false')
    expect(result).toEqual(['false'])
  })

  it('should handle function content', () => {
    const result = conditional(
      true,
      () => 'function result',
      'false',
    )
    expect(result).toEqual(['function result'])
  })
})
