import { describe, expect, it } from 'bun:test'

import {
    factory,
} from '../../src/index.js'

describe('Factory', () => {
  it('should create a factory function for a type', () => {
    const aFactory = factory.a
    expect(typeof aFactory).toBe('function')
  })

  it('should create a node with attributes and content', () => {
    const result = factory.a({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    }, 'next page')
    expect(result.t).toBe('a')
    expect(result.a).toEqual({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    expect(result.c).toEqual(['next page'])
  })

  it('should convert camelCase type to kebab-case', () => {
    const result = factory.divWithClass({}, 'content')
    expect(result.t).toBe('div-with-class')
  })
})
