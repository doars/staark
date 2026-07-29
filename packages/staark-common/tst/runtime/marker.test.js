import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    marker,
} from '../../src/index.js'

describe('Marker', () => {
  describe('marker', () => {
    it('should be the string "n"', () => {
      assert.strictEqual(marker, 'n')
    })
  })
})
