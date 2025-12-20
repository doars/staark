import { describe, expect, it } from 'bun:test'

import {
    suffixNameIfMultiple,
} from '../../src/index.js'

describe('Attribute', () => {
  describe('suffixNameIfMultiple', () => {
    it('should append [] to name if multiple is true and name does not end with []', () => {
      const attributes = { multiple: true, name: 'test' }
      suffixNameIfMultiple(attributes)
      expect(attributes.name).toBe('test[]')
    })

    it('should not append [] if name already ends with []', () => {
      const attributes = { multiple: true, name: 'test[]' }
      suffixNameIfMultiple(attributes)
      expect(attributes.name).toBe('test[]')
    })

    it('should not append [] if multiple is false', () => {
      const attributes = { multiple: false, name: 'test' }
      suffixNameIfMultiple(attributes)
      expect(attributes.name).toBe('test')
    })

    it('should not append [] if name is not provided', () => {
      const attributes = { multiple: true }
      suffixNameIfMultiple(attributes)
      expect(attributes.name).toBeUndefined()
    })

    it('should not append [] if multiple is not true', () => {
      const attributes = { name: 'test' }
      suffixNameIfMultiple(attributes)
      expect(attributes.name).toBe('test')
    })
  })
})
