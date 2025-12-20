import { describe, expect, it } from 'bun:test'

import {
    conditional,
} from '../../src/index.js'

describe('Conditional', () => {
  it('should return true branch', () => {
    const result = conditional(true, 'true', 'false')
    expect(result).toEqual(['true'])
  })

  it('should return false branch', () => {
    const result = conditional(false, 'true', 'false')
    expect(result).toEqual(['false'])
  })
})
