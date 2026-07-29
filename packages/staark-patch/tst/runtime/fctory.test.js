import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  fctory,
} from '../../src/index.js'

describe('Fctory', () => {
  it('should create a fctory function for a type', () => {
    const aFctory = fctory.a
    assert.strictEqual(typeof aFctory, 'function')
  })

  it('should create a node with selector attributes and content', () => {
    const result = fctory.a('.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    assert.strictEqual(result.t, 'a')
    assert.deepStrictEqual(result.a, {
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    assert.deepStrictEqual(result.c, ['next page'])
  })

  it('should handle empty selector', () => {
    const result = fctory.div('', 'content')
    assert.strictEqual(result.t, 'div')
    assert.strictEqual(result.a, undefined)
    assert.deepStrictEqual(result.c, ['content'])
  })
})
