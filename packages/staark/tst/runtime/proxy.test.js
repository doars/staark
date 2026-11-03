import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { isProxy, proxify } from '../../src/library/proxy.js'

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

  it('recognises the proxies it creates', () => {
    const proxy = proxify({ nested: {} }, () => {})
    assert.strictEqual(isProxy(proxy), true)
    assert.strictEqual(isProxy(proxy.nested), true)
    assert.strictEqual(isProxy({}), false)
  })

  it('does not wrap proxies again when they are assigned back', () => {
    let changes = 0
    const state = proxify({ todos: [{ text: 'a' }, { text: 'b' }] }, () => changes++)
    const first = state.todos[0]
    state.todos.reverse()
    state.todos.reverse()
    assert.strictEqual(state.todos[0], first)

    changes = 0
    state.todos[0].text = 'x'
    assert.strictEqual(changes, 1)
  })

  it('reports a single change for array methods that move items', () => {
    let changes = 0
    const state = proxify({ list: [3, 1, 2] }, () => changes++)
    const list = state.list

    assert.strictEqual(list.unshift(0), 4)
    assert.strictEqual(changes, 1)
    assert.deepStrictEqual(list.splice(1, 1, 5, 6), [3])
    assert.strictEqual(changes, 2)
    assert.strictEqual(list.shift(), 0)
    assert.strictEqual(changes, 3)
    assert.strictEqual(list.sort(), list)
    assert.strictEqual(changes, 4)
    assert.strictEqual(list.reverse(), list)
    assert.strictEqual(changes, 5)
    assert.strictEqual(list.fill(0, 3), list)
    assert.strictEqual(changes, 6)
    assert.strictEqual(list.copyWithin(0, 3), list)
    assert.strictEqual(changes, 7)
    assert.deepStrictEqual([...list], [0, 5, 2, 0])
  })

  it('does not report array methods that change nothing', () => {
    let changes = 0
    const state = proxify({ empty: [], list: [1] }, () => changes++)
    state.empty.shift()
    state.list.unshift()
    state.list.splice(0, 0)
    assert.strictEqual(changes, 0)

    state.list.splice(0, 1)
    assert.strictEqual(changes, 1)
    state.list.unshift(undefined)
    state.list.shift()
    assert.strictEqual(changes, 3)
  })

  it('proxies items inserted by array methods', () => {
    let changes = 0
    const state = proxify({ list: [] }, () => changes++)
    state.list.unshift({ value: 1 })
    state.list.splice(1, 0, { value: 2 })
    state.list.fill({ value: 3 }, 2, 2)
    changes = 0

    state.list[0].value = 4
    state.list[1].value = 5
    assert.strictEqual(changes, 2)
    assert.strictEqual(isProxy(state.list[0]), true)
  })

  it('does not change array methods called on other arrays', () => {
    let changes = 0
    const state = proxify({ list: [1, 2] }, () => changes++)
    const other = [3, 4]
    state.list.reverse.call(other)
    assert.deepStrictEqual(other, [4, 3])
    assert.strictEqual(changes, 0)
  })

  it('reads arrays through methods with the same results', () => {
    let changes = 0
    const state = proxify({ list: [{ value: 1 }, { value: 2 }] }, () => changes++)
    const list = state.list
    const [first, second] = [list[0], list[1]]

    const context = {}
    assert.deepStrictEqual(list.map(function (item, index, array) {
      assert.strictEqual(this, context)
      assert.strictEqual(array, list)
      return item
    }, context), [first, second])
    assert.strictEqual(list.find((item) => item.value === 2), second)
    assert.strictEqual(list.includes(first), true)
    assert.strictEqual(list.indexOf(second), 1)
    assert.deepStrictEqual([...list], [first, second])
    assert.deepStrictEqual(list.slice(1), [second])
    assert.strictEqual(list.reduce((sum, item, index, array) => {
      assert.strictEqual(array, list)
      return sum + item.value
    }, 0), 3)
    assert.strictEqual(list.reduce((a, b) => a.value > b.value ? a : b), second)
    assert.throws(() => proxify({ list: [] }, () => {}).list.reduce((a) => a), TypeError)
    assert.strictEqual(changes, 0)

    list.forEach((item, index, array) => {
      array[index] = { value: item.value * 10 }
    })
    assert.strictEqual(changes, 2)
    assert.strictEqual(isProxy(list[0]), true)
    for (const item of list) {
      item.value++
    }
    assert.strictEqual(changes, 4)
    assert.deepStrictEqual(list.map((item) => item.value), [11, 21])
  })
})
