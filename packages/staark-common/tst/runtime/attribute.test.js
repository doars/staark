import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    attributeToString,
    styleToString,
    styleValueToString,
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

  describe('attributeToString', () => {
    it('should return strings unchanged', () => {
      assert.strictEqual(attributeToString('id', 'test'), 'test')
    })

    it('should convert other values to strings', () => {
      assert.strictEqual(attributeToString('data-id', 1), '1')
      assert.strictEqual(attributeToString('hidden', true), 'true')
    })

    it('should join class arrays', () => {
      assert.strictEqual(attributeToString('class', ['a', 'b']), 'a b')
    })

    it('should join truthy keys of class objects', () => {
      assert.strictEqual(attributeToString('class', { a: true, b: false, c: 1 }), 'a c')
    })
  })

  describe('style helpers', () => {
    it('joins style arrays into declarations', () => {
      assert.strictEqual(attributeToString('style', ['color:red', 'margin:0']), 'color:red;margin:0')
    })

    it('converts style values', () => {
      assert.strictEqual(styleValueToString('red'), 'red')
      assert.strictEqual(styleValueToString(0), '0')
      assert.strictEqual(styleValueToString(['0', 'auto']), '0 auto')
      assert.strictEqual(styleValueToString(false), '')
      assert.strictEqual(styleValueToString(null), '')
      assert.strictEqual(styleValueToString(undefined), '')
    })

    it('converts style objects to declarations', () => {
      assert.strictEqual(
        styleToString({ color: 'red', marginTop: 0, WebkitTransform: 'none', '--gap': ['1px', '2px'], hidden: false, empty: null }),
        'color:red;margin-top:0;-webkit-transform:none;--gap:1px 2px',
      )
    })
  })
})
