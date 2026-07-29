import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  node,
} from '../../src/index.js'

describe('Node', () => {
  it('should create a node with type, attributes, and content', () => {
    const result = node('a', {
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

  it('should handle content as second parameter', () => {
    const result = node('div', 'content')
    assert.strictEqual(result.t, 'div')
    assert.strictEqual(result.a, undefined)
    assert.deepStrictEqual(result.c, ['content'])
  })

  it('should handle multiple contents', () => {
    const result = node('p', ['content1', 'content2'])
    assert.strictEqual(result.t, 'p')
    assert.strictEqual(result.a, undefined)
    assert.deepStrictEqual(result.c, ['content1', 'content2'])
  })
})
