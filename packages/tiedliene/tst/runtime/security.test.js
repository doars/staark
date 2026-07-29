import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  applyDiff,
  revertDiff,
} from '../../src/index.js'

const forbiddenComponents = [
  '__proto__',
  'constructor',
  'prototype',
]

describe('Diff security', () => {
  it('rejects forbidden components at every path position', () => {
    for (const forbiddenComponent of forbiddenComponents) {
      for (const path of [
        [forbiddenComponent],
        ['safe', forbiddenComponent],
        ['safe', 'nested', forbiddenComponent],
      ]) {
        assert.throws(
          () => applyDiff({}, [{
            type: 'set',
            path,
            new: true,
          }]),
          /Unsafe diff path component/,
        )
        assert.throws(
          () => revertDiff({}, [{
            type: 'delete',
            path,
            old: true,
          }]),
          /Unsafe diff path component/,
        )
      }
    }
    assert.strictEqual(Object.prototype.polluted, undefined)
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
})
