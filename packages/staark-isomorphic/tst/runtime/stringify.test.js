import { describe, expect, it } from 'bun:test'

import {
    node,
    stringify,
    stringifyFull,
    stringifyPatch,
    stringifyPatchFull,
} from '../../src/index.js'

describe('Stringify', () => {
  it('stringify should render node to HTML string and abstract tree', () => {
    const [rendered, abstractTree] = stringify(
      () => node('h1', 'Hello world'),
    )
    expect(rendered).toBe('<h1> Hello world </h1>')
    expect(abstractTree).toBeDefined()
    expect(abstractTree[0].t).toBe('h1')
    expect(abstractTree[0].c).toEqual(['Hello world'])
  })

  it('stringifyPatch should render abstract tree to HTML string and return abstract tree', () => {
    const [rendered, abstractTree] = stringifyPatch(
      node('h1', 'hello world'),
    )
    expect(rendered).toBe('<h1> hello world </h1>')
    expect(abstractTree).toBeDefined()
    expect(abstractTree[0].t).toBe('h1')
    expect(abstractTree[0].c).toEqual(['hello world'])
  })

  it('stringifyFull should render view function to HTML string, abstract tree string, and state string', () => {
    const [rendered, abstractTreeString, stateString] = stringifyFull(
      () => node('h1', 'hello world'),
    )
    expect(rendered).toBe('<h1> hello world </h1>')
    expect(abstractTreeString).toMatch(/"t":"h1"/)
    expect(stateString).toBe('{}')
  })

  it('stringifyPatchFull should render abstract tree to HTML string and abstract tree string', () => {
    const [rendered, abstractTreeString] = stringifyPatchFull(
      node('h1', 'hello world'),
    )
    expect(rendered).toBe('<h1> hello world </h1>')
    expect(abstractTreeString).toMatch(/"t":"h1"/)
  })
})
