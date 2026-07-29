import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    suffixNameIfMultiple,
} from '../../src/index.js'

describe('Attribute', () => {
  describe('suffixNameIfMultiple', () => {
    it('should append [] to name if multiple is true and name does not end with []', () => {
      const attributes = { multiple: true, name: 'test' }
      suffixNameIfMultiple(attributes)
      assert.strictEqual(attributes.name, 'test[]')
    })

    it('should not append [] if name already ends with []', () => {
      const attributes = { multiple: true, name: 'test[]' }
      suffixNameIfMultiple(attributes)
      assert.strictEqual(attributes.name, 'test[]')
    })

    it('should not append [] if multiple is false', () => {
      const attributes = { multiple: false, name: 'test' }
      suffixNameIfMultiple(attributes)
      assert.strictEqual(attributes.name, 'test')
    })

    it('should not append [] if name is not provided', () => {
      const attributes = { multiple: true }
      suffixNameIfMultiple(attributes)
      assert.strictEqual(attributes.name, undefined)
    })

    it('should not append [] if multiple is not true', () => {
      const attributes = { name: 'test' }
      suffixNameIfMultiple(attributes)
      assert.strictEqual(attributes.name, 'test')
    })
  })
})
