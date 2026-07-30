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
    memo,
    mount,
    node,
} from '../../src/index.js'

describe('Mount', () => {
  it('should return two functions and an object', () => {
    const app = document.createElement('div')
    const result = mount(app, () => [])
    assert.strictEqual(Array.isArray(result), true)
    assert.strictEqual(typeof(result[0]), 'function')
    assert.strictEqual(typeof(result[1]), 'function')
    assert.strictEqual(typeof(result[2]), 'object')
  })

  it('should mount a simple node', () => {
    const app = document.createElement('div')
    const result = mount(app, () => node('h1', 'hello world'))
    assert.strictEqual(app.innerHTML, '<h1>hello world</h1>')
  })

  it('preserves numeric zero attributes and styles', () => {
    const app = document.createElement('div')
    mount(app, () => node('input', {
      'aria-valuenow': 0,
      style: {
        opacity: 0,
      },
      tabindex: 0,
      value: 0,
    }))

    assert.strictEqual(app.firstChild.getAttribute('aria-valuenow'), '0')
    assert.strictEqual(app.firstChild.getAttribute('tabindex'), '0')
    assert.strictEqual(app.firstChild.value, '0')
    assert.strictEqual(app.firstChild.style.opacity, '0')
  })

  it('reorders keyed elements while preserving their identity', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('main', state.reversed
        ? [
            node('input', { key: '', value: 'empty' }),
            node('input', { key: 0, value: 'zero' }),
            node('input', { key: false, value: 'false' }),
          ]
        : [
            node('input', { key: 0, value: 'zero' }),
            node('input', { key: false, value: 'false' }),
            node('input', { key: '', value: 'empty' }),
          ]),
      { reversed: false },
    )
    const initialElements = Array.from(app.firstChild.children)

    state.reversed = true
    await update()

    const reorderedElements = Array.from(app.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[2])
    assert.strictEqual(reorderedElements[1], initialElements[0])
    assert.strictEqual(reorderedElements[2], initialElements[1])
    assert.strictEqual(reorderedElements[0].hasAttribute('key'), false)
  })

  it('inserts, removes, and replaces keyed elements', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('main', state.updated
        ? [
            node('p', { key: 'inserted' }, 'inserted'),
            node('section', { key: 'replaced' }, 'after'),
            node('p', { key: 'preserved' }, 'preserved'),
          ]
        : [
            node('p', { key: 'removed' }, 'removed'),
            node('p', { key: 'replaced' }, 'before'),
            node('p', { key: 'preserved' }, 'preserved'),
          ]),
      { updated: false },
    )
    const replacedElement = app.firstChild.children[1]
    const preservedElement = app.firstChild.children[2]

    state.updated = true
    await update()

    assert.strictEqual(app.firstChild.children.length, 3)
    assert.strictEqual(app.firstChild.children[0].textContent, 'inserted')
    assert.strictEqual(app.firstChild.children[1].localName, 'section')
    assert.notStrictEqual(app.firstChild.children[1], replacedElement)
    assert.strictEqual(app.firstChild.children[2], preservedElement)
  })

  it('reconciles keyed memo contents', async () => {
    const app = document.createElement('div')
    const renderItems = (_state, reversed) => reversed
      ? [
          node('input', { key: 'second', value: 'second' }),
          node('input', { key: 'first', value: 'first' }),
        ]
      : [
          node('input', { key: 'first', value: 'first' }),
          node('input', { key: 'second', value: 'second' }),
        ]
    const [update, _unmount, state] = mount(
      app,
      (state) => node('main', memo(renderItems, state.reversed)),
      { reversed: false },
    )
    const initialElements = Array.from(app.firstChild.children)

    state.reversed = true
    await update()

    const reorderedElements = Array.from(app.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[1])
    assert.strictEqual(reorderedElements[1], initialElements[0])
  })

  it('reconciles mixed keyed and unkeyed elements', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('main', state.reversed
        ? [
            node('input', { value: 'first unkeyed' }),
            node('input', { value: 'second unkeyed' }),
            node('input', { key: 'keyed', value: 'keyed' }),
          ]
        : [
            node('input', { value: 'first unkeyed' }),
            node('input', { key: 'keyed', value: 'keyed' }),
            node('input', { value: 'second unkeyed' }),
          ]),
      { reversed: false },
    )
    const initialElements = Array.from(app.firstChild.children)

    state.reversed = true
    await update()

    const reorderedElements = Array.from(app.firstChild.children)
    assert.strictEqual(reorderedElements[0], initialElements[0])
    assert.strictEqual(reorderedElements[1], initialElements[2])
    assert.strictEqual(reorderedElements[2], initialElements[1])
  })
})
