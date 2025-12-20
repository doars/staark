import { describe, expect, it } from 'bun:test'
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

describe('Mount with Stringify', () => {
  it('should stringify and mount with state', () => {
    const state = {}

    const [rendered, abstractTree] = stringify(
      () => node('p', 'Hello there'),
      state,
    )

    expect(rendered).toBe('<p> Hello there </p>')

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

    expect(app.innerHTML).toBe('<p> Hello there </p><p>General Kenobi</p>')
    expect(Array.isArray(result)).toBe(true)
  })
})
