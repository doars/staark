import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

import {
    node,
    prepare,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Text = window.Text

describe('Patch', () => {
  it('should prepare and apply patches', () => {
    const div = document.createElement('div')
    div.innerHTML = '<span class="item-1">Hello there</span><span class="item-2">General Kenobi</span>'

    const patch = prepare(div)

    patch(
      node('div', {
        id: 'first-id',
      }, [
        node('ul', [
          node('li', 'item 1'),
          node('li', 'item 2'),
          node('li', 'item 3'),
        ]),
      ]),
    )

    expect(div.innerHTML).toBe('<div id="first-id"><ul><li>item 1</li><li>item 2</li><li>item 3</li></ul></div>')

    patch(
      node('div', {
        id: 'second-id',
      }, [
        node('ul', [
          node('li', 'item 2'),
          node('li', 'item 3'),
          node('li', 'item 4'),
        ]),
      ]),
    )

    expect(div.innerHTML).toBe('<div id="second-id"><ul><li>item 2</li><li>item 3</li><li>item 4</li></ul></div>')
  })
})
