import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.Element = window.Element

import {
    nde,
} from '../../src/index.js'

describe('Node', () => {
  it('should create a node from a complex selector', () => {
    const result = nde('a.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    assert.strictEqual(result.t, 'a')
    assert.deepStrictEqual(result.a, {
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    assert.deepStrictEqual(result.c, ['next page'])
  })

  it('should handle simple selector', () => {
    const result = nde('div', 'content')
    assert.strictEqual(result.t, 'div')
    assert.deepStrictEqual(result.a, {})
    assert.deepStrictEqual(result.c, ['content'])
  })

  it('should handle selector with id and class', () => {
    const result = nde('span#myId.myClass', ['text'])
    assert.strictEqual(result.t, 'span')
    assert.deepStrictEqual(result.a, { id: 'myId', class: 'myClass' })
    assert.deepStrictEqual(result.c, ['text'])
  })
})
