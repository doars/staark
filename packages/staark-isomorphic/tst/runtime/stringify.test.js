import { describe, expect, it } from 'bun:test'

import {
    node,
    stringify,
} from '../../src/index.js'

describe('Stringify', () => {
  it('should render node to HTML string and abstract tree', () => {
    const [rendered, abstractTree] = stringify(
      () => node('h1', 'Hello world'),
    )
    expect(rendered).toBe('<h1> Hello world </h1>')
    expect(abstractTree).toBeDefined()
    expect(abstractTree[0].t).toBe('h1')
    expect(abstractTree[0].c).toEqual(['Hello world'])
  })
})
