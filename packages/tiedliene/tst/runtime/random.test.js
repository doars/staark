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

const createValue = (random, depth) => {
  const choice = random()
  if (depth <= 0 || choice < 0.4) {
    return PRIMITIVES[Math.floor(random() * PRIMITIVES.length)]
  }
  if (choice < 0.7) {
    const array = []
    const length = Math.floor(random() * 5)
    for (let index = 0; index < length; index++) {
      array.push(createValue(random, depth - 1))
    }
    return array
  }
  const record = {}
  for (const key of KEYS) {
    if (random() < 0.5) {
      record[key] = createValue(random, depth - 1)
    }
  }
  return record
}

// Change a copy of the value a little, so the two values share structure.
const changeValue = (random, value, depth) => {
  if (random() < 0.15) {
    return createValue(random, depth)
  }
  if (Array.isArray(value)) {
    const array = value.map((item) => changeValue(random, item, depth - 1))
    if (random() < 0.3) {
      array.length = Math.floor(random() * (array.length + 1))
    }
    while (random() < 0.3) {
      array.push(createValue(random, depth - 1))
    }
    return array
  }
  if (value && typeof value === 'object') {
    const record = {}
    for (const key of KEYS) {
      if (Object.hasOwn(value, key) && random() < 0.85) {
        record[key] = changeValue(random, value[key], depth - 1)
      } else if (random() < 0.2) {
        record[key] = createValue(random, depth - 1)
      }
    }
    return record
  }
  return random() < 0.7 ? value : createValue(random, depth)
}

describe('Random diffs', () => {
  it('apply and revert are inverses for random states', () => {
    const random = mulberry32(1)
    for (let round = 0; round < ROUNDS; round++) {
      const before = createValue(random, 4)
      if (!before || typeof before !== 'object') {
        continue
      }
      let after = changeValue(random, before, 4)
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
    }
  })
})
