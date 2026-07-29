import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
import { Window } from 'happy-dom'

import {
    mount,
    node,
} from '../../../staark/src/index.js'
import {
    stringify,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

describe('Mount with Stringify', () => {
  it('should stringify and mount with state', () => {
    const state = {}

    const [rendered, abstractTree] = stringify(
      () => node('p', 'Hello there'),
      state,
    )

    assert.strictEqual(rendered, '<p> Hello there </p>')

    const app = document.createElement('div')
    app.innerHTML = rendered

    const result = mount(
      app,
      () => [
        node('p', 'Hello there'),
        node('p', 'General Kenobi'),
      ],
      state,
      abstractTree,
    )

    assert.strictEqual(app.innerHTML, '<p> Hello there </p><p>General Kenobi</p>')
    assert.strictEqual(Array.isArray(result), true)
  })
})
