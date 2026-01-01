import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

import {
    mount,
    node,
} from '../../src/index.js'

describe('Mount', () => {
  it('should return two functions and an object', () => {
    const app = document.createElement('div')
    const result = mount(app, () => [])
    expect(Array.isArray(result)).toBe(true)
    expect(typeof(result[0])).toBe('function')
    expect(typeof(result[1])).toBe('function')
    expect(typeof(result[2])).toBe('object')
  })

  it('should mount a simple node', () => {
    const app = document.createElement('div')
    const result = mount(app, () => node('h1', 'hello world'))
    expect(app.innerHTML).toBe('<h1>hello world</h1>')
  })
})
