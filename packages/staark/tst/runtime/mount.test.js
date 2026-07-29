import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
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
    assert.strictEqual(Array.isArray(result), true)
    assert.strictEqual(typeof(result[0]), 'function')
    assert.strictEqual(typeof(result[1]), 'function')
    assert.strictEqual(typeof(result[2]), 'object')
  })

  it('should mount a simple node', () => {
    const app = document.createElement('div')
    const result = mount(app, () => node('h1', 'hello world'))
    assert.strictEqual(app.innerHTML, '<h1>hello world</h1>')
  })
})
