import { describe, expect, it } from 'bun:test'

import {
    marker,
} from '../../src/index.js'

describe('Marker', () => {
  describe('marker', () => {
    it('should be the string "n"', () => {
      expect(marker).toBe('n')
    })
  })
})
