import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  applyDiff,
  cloneRecursive,
  determineDiff,
  manageState,
  revertDiff,
} from '../../src/index.js'

const prototypeKeys = [
  '__proto__',
  'constructor',
  'prototype',
]

describe('Diff security', () => {
  it('stores prototype-related path components as own keys', () => {
    for (const key of prototypeKeys) {
      for (const path of [
        [key],
        ['safe', key],
        ['safe', 'nested', key],
      ]) {
        const state = applyDiff({}, [{
          type: 'set',
          path,
          new: { polluted: 1 },
        }])
        let current = state
        for (const component of path) {
          assert.ok(Object.hasOwn(current, component))
          assert.ok([Object.prototype, null].includes(Object.getPrototypeOf(current)))
          current = current[component]
        }
        assert.deepStrictEqual(current, { polluted: 1 })
        revertDiff(state, [{
          type: 'set',
          path,
          new: { polluted: 1 },
        }])
        let parent = state
        for (const component of path.slice(0, -1)) {
          parent = parent[component]
        }
        assert.ok(!Object.hasOwn(parent, path.at(-1)))
      }
    }
    assert.strictEqual(Object.prototype.polluted, undefined)
    assert.strictEqual({}.polluted, undefined)
  })

  it('rejects malformed paths and invalid array indices', () => {
    for (const path of [
      [],
      'key',
      [null],
      [-1],
      [1.5],
    ]) {
      assert.throws(() => applyDiff({}, [{
        type: 'set',
        path,
        new: true,
      }]), TypeError)
    }
    assert.throws(() => applyDiff([], [{
      type: 'set',
      path: ['01'],
      new: true,
    }]), /Invalid array index/)
  })

  it('fails atomically for mixed valid and invalid changes', () => {
    const state = {
      safe: false,
      primitive: true,
    }

    assert.throws(() => applyDiff(state, [{
      type: 'set',
      path: ['safe'],
      new: true,
    }, {
      type: 'set',
      path: ['primitive', 'nested'],
      new: true,
    }]), /Cannot traverse/)
    assert.deepStrictEqual(state, {
      safe: false,
      primitive: true,
    })
  })

  it('keeps prototype-related keys in managed state as own keys', () => {
    for (const key of prototypeKeys) {
      const value = JSON.parse(`{"nested": {"${key}": {"polluted": 1}}}`)
      const state = manageState({ nested: {} })
      const result = state.set(value)
      assert.ok(Object.hasOwn(result.nested, key))
      assert.strictEqual(Object.getPrototypeOf(result.nested), Object.prototype)
      assert.deepStrictEqual(result.nested[key], { polluted: 1 })
      assert.ok(!Object.hasOwn(state.undo().nested, key))
      assert.ok(Object.hasOwn(state.redo().nested, key))
    }
    assert.strictEqual(Object.prototype.polluted, undefined)
  })

  it('clones and diffs own __proto__ keys without changing the prototype', () => {
    const value = JSON.parse('{"nested": {"__proto__": {"polluted": 1}}}')
    const clone = cloneRecursive(value)
    assert.ok(Object.hasOwn(clone.nested, '__proto__'))
    assert.strictEqual(Object.getPrototypeOf(clone.nested), Object.prototype)
    assert.strictEqual(clone.nested.polluted, undefined)

    assert.deepStrictEqual(determineDiff(value, value), [])
    const diff = determineDiff({ nested: {} }, value)
    assert.deepStrictEqual(diff.map((change) => change.path), [['nested', '__proto__']])
    const state = applyDiff({ nested: {} }, diff)
    assert.ok(Object.hasOwn(state.nested, '__proto__'))
    assert.strictEqual(state.nested.polluted, undefined)
    revertDiff(state, diff)
    assert.ok(!Object.hasOwn(state.nested, '__proto__'))
    assert.strictEqual(Object.prototype.polluted, undefined)
  })
})
