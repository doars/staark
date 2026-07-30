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

  it('reorders keyed elements while preserving their identity', () => {
    const div = document.createElement('div')
    const patch = prepare(div)

    patch(node('main', [
      node('input', { key: 'first', value: 'first' }),
      node('input', { key: 'second', value: 'second' }),
      node('input', { key: 'third', value: 'third' }),
    ]))

    const initialElements = Array.from(div.firstChild.children)
    initialElements[1].customState = 'preserved'

    patch(node('main', [
      node('input', { key: 'third', value: 'third' }),
      node('input', { key: 'second', value: 'updated' }),
      node('input', { key: 'first', value: 'first' }),
    ]))

    const reorderedElements = Array.from(div.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[2])
    assert.strictEqual(reorderedElements[1], initialElements[1])
    assert.strictEqual(reorderedElements[2], initialElements[0])
    assert.strictEqual(reorderedElements[1].customState, 'preserved')
    assert.strictEqual(reorderedElements[1].value, 'updated')
    assert.strictEqual(reorderedElements[1].hasAttribute('key'), false)
  })

  it('inserts, removes, and replaces keyed elements', () => {
    const div = document.createElement('div')
    const patch = prepare(div)

    patch(node('main', [
      node('p', { key: 'removed' }, 'removed'),
      node('p', { key: 'replaced' }, 'before'),
      node('p', { key: 'preserved' }, 'preserved'),
    ]))

    const replacedElement = div.firstChild.children[1]
    const preservedElement = div.firstChild.children[2]

    patch(node('main', [
      node('p', { key: 'inserted' }, 'inserted'),
      node('section', { key: 'replaced' }, 'after'),
      node('p', { key: 'preserved' }, 'preserved'),
    ]))

    assert.strictEqual(div.firstChild.children.length, 3)
    assert.strictEqual(div.firstChild.children[0].textContent, 'inserted')
    assert.strictEqual(div.firstChild.children[1].localName, 'section')
    assert.notStrictEqual(div.firstChild.children[1], replacedElement)
    assert.strictEqual(div.firstChild.children[2], preservedElement)
  })

  it('reconciles mixed keyed and unkeyed elements', () => {
    const div = document.createElement('div')
    const patch = prepare(div)

    patch(node('main', [
      node('input', { value: 'first unkeyed' }),
      node('input', { key: 'keyed', value: 'keyed' }),
      node('input', { value: 'second unkeyed' }),
    ]))

    const initialElements = Array.from(div.firstChild.children)

    patch(node('main', [
      node('input', { value: 'updated first unkeyed' }),
      node('input', { value: 'updated second unkeyed' }),
      node('input', { key: 'keyed', value: 'updated keyed' }),
    ]))

    const reorderedElements = Array.from(div.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[0])
    assert.strictEqual(reorderedElements[1], initialElements[2])
    assert.strictEqual(reorderedElements[2], initialElements[1])
  })

  it('supports falsy keys', () => {
    const div = document.createElement('div')
    const patch = prepare(div)

    patch(node('main', [
      node('input', { key: 0, value: 'zero' }),
      node('input', { key: false, value: 'false' }),
      node('input', { key: '', value: 'empty' }),
    ]))

    const initialElements = Array.from(div.firstChild.children)

    patch(node('main', [
      node('input', { key: '', value: 'empty' }),
      node('input', { key: 0, value: 'zero' }),
      node('input', { key: false, value: 'false' }),
    ]))

    const reorderedElements = Array.from(div.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[2])
    assert.strictEqual(reorderedElements[1], initialElements[0])
    assert.strictEqual(reorderedElements[2], initialElements[1])
  })
})
