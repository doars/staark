import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
import { Window } from 'happy-dom'

import {
    node,
    prepare,
} from '../../../staark-patch/src/index.js'
import {
    stringify,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

describe('Patch with Stringify', () => {
  it('should stringify and patch', () => {
    const state = {}

    const [rendered, abstractTree] = stringify(
      () => node('p', 'Hello there'),
      state,
    )

    assert.strictEqual(rendered, '<p>Hello there</p>')

    const app = document.createElement('div')
    app.innerHTML = rendered

    const patch = prepare(
      app,
      abstractTree,
    )
    assert.strictEqual(typeof(patch), 'function')

    patch([
      node('p', 'Hello there'),
      node('p', 'General Kenobi'),
    ])

    assert.strictEqual(app.innerHTML, '<p>Hello there</p><p>General Kenobi</p>')
  })
})
