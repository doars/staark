import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { createClientSynchronizer } from '../../src/library/client-synchronizer.js'

/**
 * Creates a synchronizer that has joined a room as `me`, without a server. Sending fails, but the updates are still recorded.
 */
const createJoinedSynchronizer = (publicState, userId = 'me') => {
  const synchronizer = createClientSynchronizer({}, {}, publicState)
  const errors = []
  synchronizer.onError.addListener(({ error }) => {
    if (error.message !== 'No open socket') {
      errors.push(error.message)
    }
  })
  synchronizer.onRoomJoin.dispatch({
    creatorId: 'creator',
    roomCode: 'ROOMCD',
    userId,
    users: ['creator', 'me', 'peer'],
  })
  const receive = (data) => synchronizer.onMessage.dispatch({ data, time: {} })
  return { errors, receive, synchronizer }
}

describe('Synchronizer ordering', () => {
  it('applies an older remote update below the newer local ones', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ a: 0, b: 0 })
    const { publicState } = synchronizer
    publicState.a = 1
    synchronizer.sendUpdate()
    publicState.a = 2
    synchronizer.sendUpdate()

    receive({
      type: '_SU',
      identifier: 'remote',
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['b'], old: 0, new: 1 }],
      time: 1,
    })

    assert.deepStrictEqual({ ...publicState }, { a: 2, b: 1 })
    assert.deepStrictEqual({ ...synchronizer.privateState.previousState }, { a: 2, b: 1 })
    assert.deepStrictEqual(errors, [])
  })

  it('orders updates by time and identifier, whatever order they arrive in', () => {
    const updates = [
      { identifier: 'a', time: 10 },
      { identifier: 'b', time: 10 },
      { identifier: 'c', time: 5 },
    ].map(({ identifier, time }) => ({
      type: '_SU',
      identifier,
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['value'], old: 0, new: identifier }],
      time,
    }))
    for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      const { errors, receive, synchronizer } = createJoinedSynchronizer({ value: 0 })
      for (const index of order) {
        receive(updates[index])
      }
      // The update with the latest time, and of those the highest identifier, is applied last.
      assert.strictEqual(synchronizer.publicState.value, 'b', `order ${order}`)
      assert.deepStrictEqual(errors, [])
    }
  })

  it('keeps only the updates newer than a synchronised state', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ w: 0, x: 0, y: 0 })
    const { publicState } = synchronizer
    receive({
      type: '_SU',
      identifier: 'older',
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['x'], old: 0, new: 1 }],
      time: 1000,
    })
    receive({
      type: '_SU',
      identifier: 'newer',
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['y'], old: 0, new: 2 }],
      time: 3000,
    })
    publicState.w = 1
    synchronizer.sendUpdate()

    // The creator applied the older update, then changed x again.
    receive({
      type: '_SS',
      sender: 'creator',
      state: { w: 0, x: 7, y: 0, z: 5 },
      time: 2000,
    })

    assert.deepStrictEqual({ ...publicState }, { w: 1, x: 7, y: 2, z: 5 })
    assert.deepStrictEqual(errors, [])

    // The older update is gone: undoing the newer ones for an update older than all of them leaves x alone.
    receive({
      type: '_SU',
      identifier: 'oldest',
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['v'], new: 1 }],
      time: 1500,
    })
    assert.deepStrictEqual({ ...publicState }, { w: 1, x: 7, y: 2, z: 5, v: 1 })
  })
})

describe('Synchronizer validation', () => {
  it('ignores a synchronised state from anyone but the creator', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ a: 1 })
    receive({ type: '_SS', sender: 'peer', state: { hacked: true }, time: Date.now() })

    assert.deepStrictEqual({ ...synchronizer.publicState }, { a: 1 })
    assert.deepStrictEqual(errors, ['synchronized_state_not_from_creator'])
  })

  it('keeps the prototype when a synchronised state has a __proto__ key', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ a: 1 })
    receive({
      type: '_SS',
      sender: 'creator',
      state: JSON.parse('{"a": 2, "__proto__": {"polluted": true}}'),
      time: Date.now(),
    })

    assert.strictEqual(Object.getPrototypeOf(synchronizer.publicState), Object.prototype)
    assert.strictEqual(synchronizer.publicState.polluted, undefined)
    assert.deepStrictEqual({ ...synchronizer.publicState }, { a: 1 })
    assert.deepStrictEqual(errors, ['unsafe_state_key'])
  })

  it('rejects updates whose values contain prototype-related keys', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ a: 1 })
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      receive({
        type: '_SU',
        identifier: key,
        sender: 'peer',
        stateDelta: [{ type: 'set', path: ['b'], new: JSON.parse(`{"nested": {"${key}": {"polluted": true}}}`) }],
        time: 1,
      })
    }

    assert.deepStrictEqual({ ...synchronizer.publicState }, { a: 1 })
    assert.deepStrictEqual(errors, ['unsafe_state_key', 'unsafe_state_key', 'unsafe_state_key'])
    assert.strictEqual({}.polluted, undefined)
  })

  it('rejects unsafe paths and leaves the state as it was when a diff fails', () => {
    const { errors, receive, synchronizer } = createJoinedSynchronizer({ a: 1, b: 1 })
    for (const component of ['__proto__', 'constructor', 'prototype']) {
      receive({
        type: '_SU',
        identifier: component,
        sender: 'peer',
        stateDelta: [{ type: 'set', path: [component, 'x'], new: 1 }],
        time: 1,
      })
    }
    // The first change applies, the second can't, so neither may stay.
    receive({
      type: '_SU',
      identifier: 'half',
      sender: 'peer',
      stateDelta: [
        { type: 'set', path: ['b'], old: 1, new: 2 },
        { type: 'set', path: ['a', 'x'], new: 1 },
      ],
      time: 2,
    })
    receive({
      type: '_SU',
      identifier: 'valid',
      sender: 'peer',
      stateDelta: [{ type: 'set', path: ['c'], new: 3 }],
      time: 3,
    })

    assert.deepStrictEqual(errors, [
      'invalid_state_delta',
      'invalid_state_delta',
      'invalid_state_delta',
      'Cannot traverse a non-record diff path value',
    ])
    assert.deepStrictEqual({ ...synchronizer.publicState }, { a: 1, b: 1, c: 3 })
    assert.strictEqual({}.x, undefined)
  })
})
