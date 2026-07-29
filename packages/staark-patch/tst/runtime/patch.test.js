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
globalThis.Text = window.Text

import {
  node,
  prepare,
} from '../../src/index.js'

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

    assert.strictEqual(div.innerHTML, '<div id="first-id"><ul><li>item 1</li><li>item 2</li><li>item 3</li></ul></div>')

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

    assert.strictEqual(div.innerHTML, '<div id="second-id"><ul><li>item 2</li><li>item 3</li><li>item 4</li></ul></div>')
  })

  it('preserves numeric zero attributes and styles', () => {
    const div = document.createElement('div')
    const patch = prepare(div)

    patch(node('input', {
      'aria-valuenow': 0,
      style: {
        opacity: 0,
      },
      tabindex: 0,
      value: 0,
    }))

    assert.strictEqual(div.firstChild.getAttribute('aria-valuenow'), '0')
    assert.strictEqual(div.firstChild.getAttribute('tabindex'), '0')
    assert.strictEqual(div.firstChild.value, '0')
    assert.strictEqual(div.firstChild.style.opacity, '0')
  })
})
