import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { proxify } from '../../src/library/proxy.js'

describe('State proxy', () => {
  it('supports circular and shared state graphs', () => {
    const child = { value: false }
    const state = {
      first: child,
      second: child,
    }
    state.self = state
    let changes = 0

    const proxy = proxify(state, () => changes++)
    assert.strictEqual(proxy.self, proxy)
    assert.strictEqual(proxy.first, proxy.second)
    proxy.first.value = true
    assert.strictEqual(changes, 1)
  })

  it('does not proxy built-in values', () => {
    const date = new Date()
    const map = new Map()
    const proxy = proxify({ date, map }, () => {})
    assert.strictEqual(proxy.date, date)
    assert.strictEqual(proxy.map, map)
  })
})
