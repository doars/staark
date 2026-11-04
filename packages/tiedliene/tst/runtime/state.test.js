import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { manageState } from '../../src/index.js'

describe('Manage state', () => {
  it('clones the initial, assigned, and returned state', () => {
    const initialState = {
      nested: {
        value: 1,
      },
    }
    const state = manageState(initialState)

    initialState.nested.value = 2
    const returnedState = state.get()
    returnedState.nested.value = 3

    assert.deepStrictEqual(state.get(), {
      nested: {
        value: 1,
      },
    })

    const newState = {
      nested: {
        value: 4,
      },
    }
    state.set(newState)
    newState.nested.value = 5

    assert.deepStrictEqual(state.get(), {
      nested: {
        value: 4,
      },
    })
  })

  it('undoes and redoes nested object and array changes', () => {
    const state = manageState({
      items: ['first'],
      nested: {
        enabled: false,
      },
    })

    state.set({
      items: ['first', 'second'],
      nested: {
        enabled: true,
      },
    })

    assert.deepStrictEqual(state.undo(), {
      items: ['first'],
      nested: {
        enabled: false,
      },
    })
    assert.deepStrictEqual(state.redo(), {
      items: ['first', 'second'],
      nested: {
        enabled: true,
      },
    })
  })

  it('does not add history for an unchanged state', () => {
    const state = manageState({ value: 1 })

    state.set({ value: 1 })

    assert.deepStrictEqual(state.undo(), { value: 1 })
    assert.deepStrictEqual(state.redo(), { value: 1 })
  })

  it('clears redo history after setting a new state', () => {
    const state = manageState({ value: 1 })

    state.set({ value: 2 })
    state.undo()
    state.set({ value: 3 })

    assert.deepStrictEqual(state.redo(), { value: 3 })
    assert.deepStrictEqual(state.undo(), { value: 1 })
  })

  it('limits the number of undo operations', () => {
    const state = manageState(
      { value: 0 },
      { maximumHistory: 2 },
    )

    state.set({ value: 1 })
    state.set({ value: 2 })
    state.set({ value: 3 })

    assert.deepStrictEqual(state.undo(), { value: 2 })
    assert.deepStrictEqual(state.undo(), { value: 1 })
    assert.deepStrictEqual(state.undo(), { value: 1 })
  })
})

describe('Manage state failures', () => {
  it('leaves the state and history alone when set throws', () => {
    const state = manageState({ value: 1 })
    state.set({ value: 2 })
    state.set({ value: 3 })
    state.undo()

    assert.throws(() => state.set({ value: 4, constructor: 1 }), TypeError)
    assert.deepStrictEqual(state.get(), { value: 2 })
    assert.deepStrictEqual(state.redo(), { value: 3 })
    assert.deepStrictEqual(state.undo(), { value: 2 })
    assert.deepStrictEqual(state.undo(), { value: 1 })
    assert.deepStrictEqual(state.undo(), { value: 1 })
  })
})

describe('Manage state policies', () => {
  it('validates history and snapshot options', () => {
    assert.throws(() => manageState({}, { maximumHistory: -1 }), TypeError)
    assert.throws(() => manageState({}, { maximumHistory: 1.5 }), TypeError)
    assert.throws(() => manageState({}, { snapshot: 'unknown' }), TypeError)
  })

  it('disables history when maximumHistory is zero', () => {
    const state = manageState({ value: 1 }, { maximumHistory: 0 })
    state.set({ value: 2 })
    assert.deepStrictEqual(state.undo(), { value: 2 })
  })

  it('supports reference snapshots as an explicit mutable contract', () => {
    const state = manageState({ value: 1 }, { snapshot: 'reference' })
    const first = state.get()
    assert.strictEqual(first, state.get())
    first.value = 2
    assert.strictEqual(state.get().value, 2)
  })

  it('stores built-in values atomically and reversibly', () => {
    const state = manageState({
      date: new Date(0),
      map: new Map([['value', 1]]),
      set: new Set([1]),
      typed: new Uint8Array([1, 2]),
    })
    state.set({
      date: new Date(1),
      map: new Map([['value', 2]]),
      set: new Set([2]),
      typed: new Uint8Array([3, 4]),
    })
    const undone = state.undo()
    assert.strictEqual(undone.date.getTime(), 0)
    assert.strictEqual(undone.map.get('value'), 1)
    assert.deepStrictEqual([...undone.set], [1])
    assert.deepStrictEqual([...undone.typed], [1, 2])
    const redone = state.redo()
    assert.strictEqual(redone.date.getTime(), 1)
    assert.strictEqual(redone.map.get('value'), 2)
  })

  it('treats map and set insertion order as irrelevant', () => {
    let cloneCount = 0
    const state = manageState({
      map: new Map([['first', 1], ['second', 2]]),
      set: new Set([1, 2]),
    }, {
      clone: (value) => {
        cloneCount++
        return structuredClone(value)
      },
      snapshot: 'reference',
    })
    state.set({
      map: new Map([['second', 2], ['first', 1]]),
      set: new Set([2, 1]),
    })
    state.undo()
    assert.strictEqual(cloneCount, 1)
  })

  it('rejects unsupported values before changing state', () => {
    const state = manageState({ value: 1 })
    assert.throws(() => state.set({ value: () => {} }), /Unsupported/)
    assert.deepStrictEqual(state.get(), { value: 1 })
    assert.throws(() => state.set({ value: new WeakMap() }), /Unsupported/)
    assert.throws(() => state.set({ value: new (class Custom {})() }), /Unsupported/)
    assert.throws(() => state.set({ [Symbol('value')]: 1 }), /symbol-keyed/)
    const accessor = {}
    Object.defineProperty(accessor, 'value', {
      enumerable: true,
      get: () => 1,
    })
    assert.throws(() => state.set(accessor), /accessor/)
  })

  it('preserves circular and shared references through undo and redo', () => {
    const shared = { value: 1 }
    const initial = { left: shared, right: shared }
    initial.self = initial
    const state = manageState(initial)
    const changedShared = { value: 2 }
    const changed = { left: changedShared, right: changedShared }
    changed.self = changed
    state.set(changed)
    const undone = state.undo()
    assert.strictEqual(undone.self, undone)
    assert.strictEqual(undone.left, undone.right)
    assert.strictEqual(undone.left.value, 1)
    const redone = state.redo()
    assert.strictEqual(redone.self, redone)
    assert.strictEqual(redone.left, redone.right)
    assert.strictEqual(redone.left.value, 2)
  })
})
