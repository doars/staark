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

  const countMoves = (element) => {
    const counter = { moves: 0 }
    for (const method of ['insertBefore', 'moveBefore']) {
      const original = element[method]
      if (original) {
        element[method] = function (...args) {
          if (args[0].parentNode === element) {
            counter.moves++
          }
          return original.apply(this, args)
        }
      }
    }
    return counter
  }

  it('does not move nodes when the first keyed item is removed', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('ul', state.items.map(
        (item) => node('li', { key: item }, item),
      )),
      { items: [1, 2, 3, 4, 5, 6, 7, 8] },
    )
    const list = app.firstChild
    const kept = Array.from(list.children).slice(1)
    const counter = countMoves(list)

    state.items.shift()
    await update()

    assert.strictEqual(counter.moves, 0)
    assert.deepStrictEqual(Array.from(list.children), kept)
  })

  it('moves only the swapped keyed items', async () => {
    const app = document.createElement('div')
    const items = Array.from({ length: 50 }, (_, index) => index)
    const [update, _unmount, state] = mount(
      app,
      (state) => node('ul', state.items.map(
        (item) => node('li', { key: item }, String(item)),
      )),
      { items },
    )
    const list = app.firstChild
    const initial = Array.from(list.children)
    const counter = countMoves(list)

    const first = state.items[1]
    state.items[1] = state.items[48]
    state.items[48] = first
    await update()

    assert.ok(counter.moves <= 2, `expected at most 2 moves, got ${counter.moves}`)
    const expected = initial.slice()
    expected[1] = initial[48]
    expected[48] = initial[1]
    assert.deepStrictEqual(Array.from(list.children), expected)
    assert.strictEqual(list.textContent, state.items.join(''))
  })

  it('does not rewrite unchanged attributes', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('p', {
        class: { active: true },
        style: { color: 'red' },
        title: 'same',
      }, String(state.count)),
      { count: 0 },
    )
    const paragraph = app.firstChild
    let writes = 0
    const setAttribute = paragraph.setAttribute
    paragraph.setAttribute = function (...args) {
      writes++
      return setAttribute.apply(this, args)
    }

    state.count++
    await update()

    assert.strictEqual(paragraph.textContent, '1')
    assert.strictEqual(writes, 0)
  })

  it('compares attributes with the previous render', async () => {
    const div = document.createElement('div')
    div.innerHTML = '<p class="old" title="kept" data-id="1"></p>'
    const paragraph = div.firstChild
    let writes = 0
    const setAttribute = paragraph.setAttribute
    paragraph.setAttribute = function (...args) {
      writes++
      return setAttribute.apply(this, args)
    }
    const [update, , state] = mount(div, (state) =>
      node('p', { class: state.class, title: 'kept', 'data-id': state.id }),
      { class: { new: true }, id: 1 },
    )
    assert.strictEqual(paragraph.outerHTML, '<p class="new" title="kept" data-id="1"></p>')
    assert.strictEqual(writes, 1)

    state.class = ['new']
    state.id = '1'
    await update()
    assert.strictEqual(writes, 1)

    state.class = { new: false, other: true }
    state.id = 2
    await update()
    assert.strictEqual(paragraph.outerHTML, '<p class="other" title="kept" data-id="2"></p>')
    assert.strictEqual(writes, 3)
  })

  it('ignores inherited attributes and styles', async () => {
    const div = document.createElement('div')
    Object.prototype.title = 'polluted'
    Object.prototype.color = 'red'
    try {
      const [update, , state] = mount(div, (state) =>
        node('p', { id: state.id, style: state.style }),
        { id: 'a', style: { margin: '0' } },
      )
      state.id = 'b'
      state.style = { padding: '0' }
      await update()
    } finally {
      delete Object.prototype.title
      delete Object.prototype.color
    }
    assert.strictEqual(div.innerHTML, '<p id="b" style="padding: 0px;"></p>')
  })

  it('re-renders memos whose memory is mutated in place', async () => {
    const div = document.createElement('div')
    const renderItem = (_state, todo) => node('li', todo.text)
    const [update, , state] = mount(
      div,
      (state) => node('ul', memo(renderItem, state.todo)),
      { todo: { text: 'a' } },
    )
    assert.strictEqual(div.innerHTML, '<ul><li>a</li></ul>')

    state.todo.text = 'b'
    await update()
    assert.strictEqual(div.innerHTML, '<ul><li>b</li></ul>')
  })

  it('reuses memos in lists by memory and by position', async () => {
    const div = document.createElement('div')
    const rendered = []
    const renderItem = (_state, todo) => {
      rendered.push(todo.text)
      return node('li', todo.text)
    }
    const renderLabel = (_state, label) => {
      rendered.push(label.text)
      return node('li', label.text)
    }
    const [update, , state] = mount(
      div,
      (state) => node('ul', [
        ...state.todos.map((todo) => memo(renderItem, todo)),
        ...state.labels.map((label) => memo(renderLabel, { text: label })),
      ]),
      { todos: [{ text: 'a' }, { text: 'b' }, { text: 'c' }], labels: ['x', 'y'] },
    )
    assert.deepStrictEqual(rendered, ['a', 'b', 'c', 'x', 'y'])

    rendered.length = 0
    state.todos[1].text = 'B'
    await update()
    assert.deepStrictEqual(rendered, ['B'])
    assert.strictEqual(div.innerHTML, '<ul><li>a</li><li>B</li><li>c</li><li>x</li><li>y</li></ul>')

    rendered.length = 0
    state.todos.reverse()
    state.labels = ['x', 'z']
    await update()
    assert.deepStrictEqual(rendered, ['z'])
    assert.strictEqual(div.innerHTML, '<ul><li>c</li><li>B</li><li>a</li><li>x</li><li>z</li></ul>')
  })

  it('creates and updates single text children', async () => {
    const div = document.createElement('div')
    const [update, , state] = mount(div, (state) => state.items.map((item) => node('p', [item])), { items: ['', 'a', '0'] })
    assert.strictEqual(div.innerHTML, '<p></p><p>a</p><p>0</p>')
    assert.strictEqual(div.firstChild.childNodes.length, 1)
    state.items = ['x', 'b', 'c']
    await update()
    assert.strictEqual(div.innerHTML, '<p>x</p><p>b</p><p>c</p>')
  })

  it('keeps a shared keyed suffix in place', async () => {
    const div = document.createElement('div')
    const [update, , state] = mount(div, (state) => node('ul', state.keys.map((key) => node('li', { key }, key))), { keys: ['a', 'b', 'c', 'd'] })
    const [a, b, c, d] = div.firstChild.children

    state.keys = ['a', 'c', 'b', 'x', 'd']
    await update()
    assert.strictEqual(div.innerHTML, '<ul><li>a</li><li>c</li><li>b</li><li>x</li><li>d</li></ul>')
    assert.deepStrictEqual([...div.firstChild.children].filter((child) => child.textContent !== 'x'), [a, c, b, d])

    state.keys = ['y', 'a', 'b', 'x', 'd']
    await update()
    assert.strictEqual(div.innerHTML, '<ul><li>y</li><li>a</li><li>b</li><li>x</li><li>d</li></ul>')
    assert.strictEqual(div.firstChild.lastChild, d)
  })

  it('removes styles set to false and supports style arrays', async () => {
    const div = document.createElement('div')
    const [update, , state] = mount(div, (state) => node('p', { style: state.style }), { style: { color: 'red', marginTop: '1px' } })
    state.style = { color: false, marginTop: '1px' }
    await update()
    assert.strictEqual(div.firstChild.style.color, '')
    assert.strictEqual(div.firstChild.style.marginTop, '1px')

    state.style = ['color:blue', 'margin:0']
    await update()
    assert.strictEqual(div.firstChild.style.color, 'blue')
    state.style = { padding: '0' }
    await update()
    assert.strictEqual(div.firstChild.style.color, '')
    assert.strictEqual(div.firstChild.style.padding, '0px')
  })

  it('skips unchanged memo contents and supports empty and nested memos', async () => {
    const app = document.createElement('div')
    let renders = 0
    const renderInner = () => node('span', 'inner')
    const renderMemo = () => {
      renders++
      return node('section', memo(renderInner, null))
    }
    const [update, _unmount, state] = mount(
      app,
      (state) => [
        memo(() => null, null),
        memo(renderMemo, null),
        node('p', String(state.count)),
      ],
      { count: 0 },
    )
    const section = app.firstChild
    assert.strictEqual(section.innerHTML, '<span>inner</span>')

    state.count++
    await update()

    assert.strictEqual(renders, 1)
    assert.strictEqual(app.firstChild, section)
    assert.strictEqual(app.innerHTML, '<section><span>inner</span></section><p>1</p>')
  })

  it('swaps and removes event listeners', async () => {
    const app = document.createElement('div')
    const calls = []
    const [update, _unmount, state] = mount(
      app,
      (state) => node('button', state.mode === 'none'
        ? {}
        : { click: state.mode === 'a' ? () => calls.push('a') : () => calls.push('b') }),
      { mode: 'a' },
    )
    const button = app.firstChild

    button.click()
    state.mode = 'b'
    await update()
    button.click()
    state.mode = 'none'
    await update()
    button.click()

    assert.deepStrictEqual(calls, ['a', 'b'])
  })

  it('keeps input values controlled by the state', async () => {
    const app = document.createElement('div')
    const [update, _unmount, state] = mount(
      app,
      (state) => node('input', { value: state.value }),
      { value: 'state' },
    )
    const input = app.firstChild

    input.value = 'typed'
    await update()

    assert.strictEqual(input.value, 'state')
  })

  it('sets classes on SVG elements', () => {
    const app = document.createElement('div')
    mount(app, () => node('svg', { class: ['icon', 'large'] }))

    assert.strictEqual(app.firstChild.getAttribute('class'), 'icon large')
  })

  it('hydrates existing content that contains comments', () => {
    const app = document.createElement('div')
    app.innerHTML = '<!-- server --><p>old</p>'
    mount(app, () => node('p', 'new'))

    assert.strictEqual(app.innerHTML, '<p>new</p>')
  })

  it('uses a state proxy from another mount directly', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    const [_update, _unmount, state] = mount(
      first,
      (state) => node('p', String(state.nested.count)),
      { nested: { count: 0 } },
    )
    const [updateSecond, _unmountSecond, secondState] = mount(
      second,
      (state) => node('p', String(state.nested.count)),
      state,
    )

    assert.strictEqual(secondState, state)
    state.nested.count++
    await updateSecond()

    assert.strictEqual(first.textContent, '1')
    assert.strictEqual(second.textContent, '1')
  })

  it('uses a user created proxy directly', async () => {
    const app = document.createElement('div')
    const proxy = new Proxy({ count: 1 }, {})
    const [update, _unmount, state] = mount(
      app,
      (state) => node('p', String(state.count)),
      proxy,
    )
    assert.strictEqual(state, proxy)

    proxy.count = 2
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.strictEqual(app.textContent, '1')

    await update()
    assert.strictEqual(app.textContent, '2')
  })

  it('still wraps plain state that contains functions', async () => {
    const app = document.createElement('div')
    const initial = { count: 1, format: (count) => `#${count}` }
    const [_update, _unmount, state] = mount(
      app,
      (state) => node('p', state.format(state.count)),
      initial,
    )
    assert.notStrictEqual(state, initial)

    state.count = 2
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.strictEqual(app.textContent, '#2')
  })

  it('reuses hydrated elements', () => {
    const app = document.createElement('div')
    app.innerHTML = '<ul class="list"><li>one</li></ul>'
    const list = app.firstChild
    mount(app, () => node('ul', { class: 'list' }, [
      node('li', 'one'),
      node('li', 'two'),
    ]))

    assert.strictEqual(app.firstChild, list)
    assert.strictEqual(app.innerHTML, '<ul class="list"><li>one</li><li>two</li></ul>')
  })
})
