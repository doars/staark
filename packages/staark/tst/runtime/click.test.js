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

describe('Click', () => {
  it('should handle click events and update state', async () => {
    const app = document.createElement('div')
    const [_update, _unmount, state] = mount(
      app,
      (state) => [
        (state.clicks % 2) === 0 ? (
          node('button', {
            click: (_event, state) => state.clicks += 1,
          }, 'Click me!')
        ) : node('span', 'Can\'t click me!'),

        (state.clicks % 2) === 1 ? (
          node('button', {
            click: (_event, state) => state.clicks += 1,
          }, 'Click me!')
        ) : node('span', 'Can\'t click me!'),

        node('span', ' clicks: ' + state.clicks),
      ],
      { clicks: 0 },
    )

    assert.strictEqual(state.clicks, 0)
    assert.notStrictEqual(app.querySelector('button'), null)
    assert.strictEqual(app.querySelector('button').nextElementSibling.tagName, 'SPAN')
    assert.ok(app.textContent.includes(' clicks: 0'))

    app.querySelector('button').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.clicks, 1)
    assert.notStrictEqual(app.querySelector('button'), null)
    assert.strictEqual(app.querySelector('button').previousElementSibling.tagName, 'SPAN')
    assert.ok(app.textContent.includes(' clicks: 1'))

    app.querySelector('button').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(state.clicks, 2)
    assert.notStrictEqual(app.querySelector('button'), null)
    assert.strictEqual(app.querySelector('button').nextElementSibling.tagName, 'SPAN')
    assert.ok(app.textContent.includes(' clicks: 2'))
  })
})
