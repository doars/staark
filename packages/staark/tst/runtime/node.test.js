import { describe, expect, it } from 'bun:test'

import {
    node,
} from '../../src/index.js'

describe('Node', () => {
  it('should create a node object', () => {
    const result = node('a', {
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true,
    }, 'next page')
    expect(result).toBeDefined()
    expect(result.t).toBe('a')
    expect(result.a.class).toBe('nav-link')
    expect(result.c).toEqual(['next page'])
  })
})
