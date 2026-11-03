import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  increasingSubsequence,
} from '../../src/index.js'

const included = (sources) => {
  const result = increasingSubsequence(sources)
  return sources.map((_, index) => !!result[index])
}

describe('Sequence', () => {
  describe('increasingSubsequence', () => {
    it('handles empty and sparse input', () => {
      assert.deepStrictEqual(included([]), [])
      assert.deepStrictEqual(included([undefined, undefined]), [false, false])
      const sparse = []
      sparse[2] = 0
      sparse[4] = 1
      assert.deepStrictEqual(increasingSubsequence(sparse)[2], true)
      assert.deepStrictEqual(increasingSubsequence(sparse)[4], true)
    })

    it('keeps an already sorted sequence', () => {
      assert.deepStrictEqual(included([0, 1, 2, 3]), [true, true, true, true])
    })

    it('finds a longest increasing subsequence', () => {
      assert.deepStrictEqual(included([0, 3, 2, 1, 4]).filter(Boolean).length, 3)
      assert.deepStrictEqual(included([0, 8, 2, 3, 4, 5, 6, 7, 1, 9]), [true, false, true, true, true, true, true, true, false, true])
      assert.deepStrictEqual(included([3, 2, 1, 0]).filter(Boolean).length, 1)
    })

    it('returns an increasing selection', () => {
      for (let trial = 0; trial < 200; trial++) {
        const sources = Array.from({ length: 30 }, () => Math.random() < 0.2 ? undefined : Math.floor(Math.random() * 30))
        const result = increasingSubsequence(sources)
        const picked = sources.filter((_, index) => result[index])
        for (let index = 1; index < picked.length; index++) {
          assert.ok(picked[index - 1] < picked[index])
        }
      }
    })
  })
})
