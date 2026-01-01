import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

import {
    memo,
    mount,
    node,
} from '../../src/index.js'

describe('Memo', () => {
  it('should handle memoization correctly', async () => {
    const app = document.createElement('div')
    const memoAlwaysUpdate = (state) =>
      node('div', [
        'with memo, will update, use memo input: ',
        state.count,
      ])
    const memoNeverUpdate = (state) =>
      node('div', [
        'with memo, will not update: ',
        state.count,
      ])
    const memoHalfUpdate = (state) =>
      node('div', [
        'with memo function, but only updates half the time: ',
        state.count,
      ])
    const [_update, _unmount, proxy] = mount(
      app,
      (state) => [
        node('div', [
          'without memo, will update: ',
          state.count,
        ]),
        memo(
          memoAlwaysUpdate,
          state.count
        ),
        memo(
          memoNeverUpdate,
          null,
        ),
        memo(
          memoHalfUpdate,
          Math.floor(state.count / 2),
        ),
      ],
      { count: 0 },
    )

    let divs = app.querySelectorAll('div')
    expect(divs[0].textContent).toBe('without memo, will update: 0')
    expect(divs[1].textContent).toBe('with memo, will update, use memo input: 0')
    expect(divs[2].textContent).toBe('with memo, will not update: 0')
    expect(divs[3].textContent).toBe('with memo function, but only updates half the time: 0')

    proxy.count = 1
    await new Promise(resolve => setTimeout(resolve, 0))

    divs = app.querySelectorAll('div')
    expect(divs[0].textContent).toBe('without memo, will update: 1')
    expect(divs[1].textContent).toBe('with memo, will update, use memo input: 1')
    expect(divs[2].textContent).toBe('with memo, will not update: 0')
    expect(divs[3].textContent).toBe('with memo function, but only updates half the time: 0')

    proxy.count = 2
    await new Promise(resolve => setTimeout(resolve, 0))

    divs = app.querySelectorAll('div')
    expect(divs[0].textContent).toBe('without memo, will update: 2')
    expect(divs[1].textContent).toBe('with memo, will update, use memo input: 2')
    expect(divs[2].textContent).toBe('with memo, will not update: 0')
    expect(divs[3].textContent).toBe('with memo function, but only updates half the time: 2')
  })
})
