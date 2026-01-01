import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.Element = window.Element

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
    expect(result.t).toBe('a')
    expect(result.a).toEqual({
      class: 'nav-link',
      href: '/next-page/',
      target: '_blank',
      'data-active': true
    })
    expect(result.c).toEqual(['next page'])
  })

  it('should handle content as second parameter', () => {
    const result = node('div', 'content')
    expect(result.t).toBe('div')
    expect(result.a).toBeUndefined()
    expect(result.c).toEqual(['content'])
  })

  it('should handle multiple contents', () => {
    const result = node('p', ['content1', 'content2'])
    expect(result.t).toBe('p')
    expect(result.a).toBeUndefined()
    expect(result.c).toEqual(['content1', 'content2'])
  })
})
