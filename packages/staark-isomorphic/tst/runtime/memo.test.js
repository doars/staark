import { describe, expect, it } from 'bun:test'

import {
    memo,
    node,
} from '../../src/index.js'

describe('Memo', () => {
  it('should create a memo object with render function and memory', () => {
    const render = () => node('div', 'content')
    const memory = { memory: 0 }
    const result = memo(render, memory)
    expect(result._).toBeDefined()
    expect(result.r).toBe(render)
    expect(result.m).toBe(memory)
  })
})
