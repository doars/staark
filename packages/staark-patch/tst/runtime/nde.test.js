import { describe, expect, it } from 'bun:test'

import {
  nde,
} from '../../src/index.js'

describe('Nde', () => {
  it('should create a node from a complex selector', () => {
    const result = nde('a.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    expect(result.t).toBe('a')
    expect(result.a).toEqual({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    expect(result.c).toEqual(['next page'])
  })

  it('should handle simple selector', () => {
    const result = nde('div', 'content')
    expect(result.t).toBe('div')
    expect(result.a).toEqual({})
    expect(result.c).toEqual(['content'])
  })

  it('should handle selector with id and class', () => {
    const result = nde('span#myId.myClass', ['text'])
    expect(result.t).toBe('span')
    expect(result.a).toEqual({ id: 'myId', class: 'myClass' })
    expect(result.c).toEqual(['text'])
  })
})