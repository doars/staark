import { describe, expect, it } from 'bun:test'

import {
    fctory,
} from '../../src/index.js'

describe('Factory', () => {
  it('should create elements via factory functions', () => {
    const { a } = fctory
    const result = a('.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    expect(result.t).toBe('a')
    expect(result.a.class).toBe('nav-link')
    expect(result.a.href).toBe('/next-page/')
    expect(result.c).toEqual(['next page'])
  })
})
