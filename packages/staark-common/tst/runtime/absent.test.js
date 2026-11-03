import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { isAbsent } from '../../src/index.js'

describe('Absent', () => {
  it('treats only null, undefined, and false as absent', () => {
    assert.strictEqual(isAbsent(null), true)
    assert.strictEqual(isAbsent(undefined), true)
    assert.strictEqual(isAbsent(false), true)
    assert.strictEqual(isAbsent(0), false)
    assert.strictEqual(isAbsent(''), false)
    assert.strictEqual(isAbsent(NaN), false)
    assert.strictEqual(isAbsent(true), false)
  })
})
