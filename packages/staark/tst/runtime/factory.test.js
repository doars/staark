import { describe, expect, it } from 'bun:test'

import {
    factory,
} from '../../src/index.js'

describe('Factory', () => {
  it('should create elements via factory functions', () => {
    const { a } = factory
    const result = a({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true,
    }, 'next page')
    expect(result.t).toBe('a')
    expect(result.a.class).toBe('nav-link')
    expect(result.a.href).toBe('/next-page/')
    expect(result.c).toEqual(['next page'])
  })
})
