import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  factory,
} from '../../src/index.js'

describe('Factory', () => {
  it('should create a factory function for a type', () => {
    const aFactory = factory.a
    assert.strictEqual(typeof aFactory, 'function')
  })

  it('should create a node with attributes and content', () => {
    const result = factory.a({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    }, 'next page')
    assert.strictEqual(result.t, 'a')
    assert.deepStrictEqual(result.a, {
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    assert.deepStrictEqual(result.c, ['next page'])
  })

  it('should convert camelCase type to kebab-case', () => {
    const result = factory.divWithClass({}, 'content')
    assert.strictEqual(result.t, 'div-with-class')
  })
})
