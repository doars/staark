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

  it('preserves numeric zero attributes and styles', () => {
    const app = document.createElement('div')
    mount(app, () => node('input', {
      'aria-valuenow': 0,
      style: {
        opacity: 0,
      },
      tabindex: 0,
      value: 0,
    }))

    assert.strictEqual(app.firstChild.getAttribute('aria-valuenow'), '0')
    assert.strictEqual(app.firstChild.getAttribute('tabindex'), '0')
    assert.strictEqual(app.firstChild.value, '0')
    assert.strictEqual(app.firstChild.style.opacity, '0')
  })
})
