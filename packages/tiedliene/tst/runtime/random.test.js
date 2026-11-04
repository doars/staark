import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  applyDiff,
  cloneRecursive,
  determineDiff,
  revertDiff,
} from '../../src/index.js'

const ROUNDS = 2000

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

const KEYS = ['a', 'b', 'c', 'd', 'e']
const PRIMITIVES = [0, 1, 2, 'a', 'b', null, undefined, true]

// Containers in the pool are finished, so reusing one shares it without
// creating a cycle.
const createValue = (random, depth, pool) => {
  const choice = random()
  if (pool?.length > 0 && choice < 0.15) {
    return pool[Math.floor(random() * pool.length)]
  }
  if (depth <= 0 || choice < 0.4) {
    return PRIMITIVES[Math.floor(random() * PRIMITIVES.length)]
  }
  if (choice < 0.7) {
    const array = []
    const length = Math.floor(random() * 5)
    for (let index = 0; index < length; index++) {
      array.push(createValue(random, depth - 1, pool))
    }
    pool?.push(array)
    return array
  }
  const record = {}
  for (const key of KEYS) {
    if (random() < 0.5) {
      record[key] = createValue(random, depth - 1, pool)
    }
  }
  pool?.push(record)
  return record
}

// Change a copy of the value a little, so the two values have a similar
// structure. With a pool, a changed container is sometimes reused for the
// same original, so sharing can be kept as well as split.
const changeValue = (random, value, depth, pool, changed) => {
  if (random() < 0.15) {
    return createValue(random, depth, pool)
  }
  if (changed?.has(value) && random() < 0.5) {
    return changed.get(value)
  }
  let result
  if (Array.isArray(value)) {
    result = value.map((item) =>
      changeValue(random, item, depth - 1, pool, changed),
    )
    if (random() < 0.3) {
      result.length = Math.floor(random() * (result.length + 1))
    }
    while (random() < 0.3) {
      result.push(createValue(random, depth - 1, pool))
    }
  } else if (value && typeof value === 'object') {
    result = {}
    for (const key of KEYS) {
      if (Object.hasOwn(value, key) && random() < 0.85) {
        result[key] = changeValue(random, value[key], depth - 1, pool, changed)
      } else if (random() < 0.2) {
        result[key] = createValue(random, depth - 1, pool)
      }
    }
  } else {
    return random() < 0.7 ? value : createValue(random, depth, pool)
  }
  changed?.set(value, result)
  return result
}

const roundTrip = (before, after) => {
  if (
    !after ||
    typeof after !== 'object' ||
    Array.isArray(after) !== Array.isArray(before)
  ) {
    after = cloneRecursive(before)
  }
  const diff = determineDiff(before, after)
  const state = applyDiff(cloneRecursive(before), diff)
  assert.deepStrictEqual(state, after)
  assert.deepStrictEqual(revertDiff(state, diff), before)
  assert.deepStrictEqual(applyDiff(state, diff), after)
}

// Build a diff by hand, one random change at a time, so paths repeat and array
// items are deleted from anywhere.
const createChanges = (random, state) => {
  const changes = []
  const count = 1 + Math.floor(random() * 8)
  for (let step = 0; step < count; step++) {
    const path = []
    let current = state
    while (true) {
      const keys = Array.isArray(current) ? [...current.keys()] : Object.keys(current)
      const key = keys[Math.floor(random() * keys.length)]
      const next = current[key]
      if (keys.length === 0 || !next || typeof next !== 'object' || random() < 0.4) {
        break
      }
      path.push(key)
      current = next
    }
    const isArray = Array.isArray(current)
    const keys = isArray ? [...current.keys()] : Object.keys(current)
    let change
    if (keys.length > 0 && random() < 0.4) {
      const key = keys[Math.floor(random() * keys.length)]
      change = { type: 'delete', path: [...path, key], old: cloneRecursive(current[key]) }
    } else {
      const key = isArray
        ? Math.floor(random() * (current.length + 1))
        : KEYS[Math.floor(random() * KEYS.length)]
      change = { type: 'set', path: [...path, key], new: createValue(random, 2) }
      if (Object.hasOwn(current, key)) {
        change.old = cloneRecursive(current[key])
      }
    }
    applyDiff(state, [change])
    changes.push(change)
  }
  return changes
}

describe('Random diffs', () => {
  it('revert undoes random hand-written diffs', () => {
    const random = mulberry32(3)
    for (let round = 0; round < ROUNDS; round++) {
      const before = createValue(random, 4)
      if (before && typeof before === 'object') {
        const state = cloneRecursive(before)
        const diff = createChanges(random, state)
        assert.deepStrictEqual(revertDiff(state, diff), before)
      }
    }
  })

  it('apply and revert are inverses for random states', () => {
    const random = mulberry32(1)
    for (let round = 0; round < ROUNDS; round++) {
      const before = createValue(random, 4)
      if (before && typeof before === 'object') {
        roundTrip(before, changeValue(random, before, 4))
      }
    }
  })

  it('apply and revert are inverses for random shared states', () => {
    const random = mulberry32(2)
    for (let round = 0; round < ROUNDS; round++) {
      const pool = []
      const before = createValue(random, 4, pool)
      if (before && typeof before === 'object') {
        roundTrip(before, changeValue(random, before, 4, pool, new Map()))
      }
    }
  })
})
