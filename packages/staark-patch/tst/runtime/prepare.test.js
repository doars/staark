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
  prepare,
} from '../../src/index.js'

describe('Prepare', () => {
  it('should return a patch function', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    assert.strictEqual(typeof patch, 'function')
  })
})
