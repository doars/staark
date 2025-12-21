import { describe, expect, it } from 'bun:test'
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

describe('Patch with Stringify', () => {
  it('should stringify and patch', () => {
    const state = {}

    const [rendered, abstractTree] = stringify(
      () => node('p', 'Hello there'),
      state,
    )

    expect(rendered).toBe('<p> Hello there </p>')

    const app = document.createElement('div')
    app.innerHTML = rendered

    const patch = prepare(
      app,
      abstractTree,
    )
    expect(typeof(patch)).toBe('function')

    patch([
      node('p', 'Hello there'),
      node('p', 'General Kenobi'),
    ])

    expect(app.innerHTML).toBe('<p> Hello there </p><p>General Kenobi</p>')
  })
})
