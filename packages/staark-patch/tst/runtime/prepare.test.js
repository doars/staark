import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

import {
    prepare,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document

describe('Prepare', () => {
  it('should return a patch function', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    expect(typeof patch).toBe('function')
  })
})
