import { describe, expect, it } from 'bun:test'

import {
    nde,
} from '../../src/index.js'

describe('Node', () => {
  it('should create a node object', () => {
    const result = nde('a.nav-link[href="/next-page/"][target=_blank][data-active]', 'next page')
    expect(result).toBeDefined()
    expect(result.t).toBe('a')
    expect(result.a.class).toBe('nav-link')
    expect(result.c).toEqual(['next page'])
  })
})
