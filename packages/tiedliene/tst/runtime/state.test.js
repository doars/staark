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
