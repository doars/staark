import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    memo,
    node,
} from '../../src/index.js'

describe('Memo', () => {
  it('should create a memo object with render function and memory', () => {
    const render = () => node('div', 'content')
    const memory = { memory: 0 }
    const result = memo(render, memory)
    assert.notStrictEqual(result._, undefined)
    assert.strictEqual(result.r, render)
    assert.strictEqual(result.m, memory)
  })
})
