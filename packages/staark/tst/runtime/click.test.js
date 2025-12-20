import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

import {
    mount,
    node,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document

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

    expect(state.clicks).toBe(0)
    expect(app.querySelector('button')).not.toBeNull()
    expect(app.querySelector('button').nextElementSibling.tagName).toBe('SPAN')
    expect(app.textContent).toContain(' clicks: 0')

    app.querySelector('button').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(state.clicks).toBe(1)
    expect(app.querySelector('button')).not.toBeNull()
    expect(app.querySelector('button').previousElementSibling.tagName).toBe('SPAN')
    expect(app.textContent).toContain(' clicks: 1')

    app.querySelector('button').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(state.clicks).toBe(2)
    expect(app.querySelector('button')).not.toBeNull()
    expect(app.querySelector('button').nextElementSibling.tagName).toBe('SPAN')
    expect(app.textContent).toContain(' clicks: 2')
  })
})
