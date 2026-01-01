import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.Element = window.Element

import {
    fctory,
} from '../../src/index.js'

describe('Factory', () => {
  it('should create a factory function for a type', () => {
    const aFactory = fctory.a
    expect(typeof aFactory).toBe('function')
  })

  it('should create a node with selector attributes and content', () => {
    const result = fctory.a('.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    expect(result.t).toBe('a')
    expect(result.a).toEqual({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    expect(result.c).toEqual(['next page'])
  })

  it('should handle empty selector', () => {
    const result = fctory.div('', 'content')
    expect(result.t).toBe('div')
    expect(result.a).toBeUndefined()
    expect(result.c).toEqual(['content'])
  })
})
