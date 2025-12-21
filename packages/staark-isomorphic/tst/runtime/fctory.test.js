import { describe, expect, it } from 'bun:test'

import {
    fctory,
} from '../../src/index.js'

describe('Fctory', () => {
  it('should create a fctory function for a type', () => {
    const aFctory = fctory.a
    expect(typeof aFctory).toBe('function')
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
