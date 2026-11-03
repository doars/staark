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
  const list = (items) => node('ul', items.map((item) => node('li', { key: item }, String(item))))

  it('does not move nodes when the first keyed item is removed', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    patch(list([1, 2, 3, 4, 5]))
    const ul = div.firstChild
    const kept = Array.from(ul.children).slice(1)
    const counter = countMoves(ul)

    patch(list([2, 3, 4, 5]))

    assert.strictEqual(counter.moves, 0)
    assert.deepStrictEqual(Array.from(ul.children), kept)
  })

  it('moves only the swapped keyed items', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    const items = Array.from({ length: 50 }, (_, index) => index)
    patch(list(items))
    const ul = div.firstChild
    const initial = Array.from(ul.children)
    const counter = countMoves(ul)

    const swapped = items.slice()
    swapped[1] = 48
    swapped[48] = 1
    patch(list(swapped))

    assert.ok(counter.moves <= 2, `expected at most 2 moves, got ${counter.moves}`)
    assert.strictEqual(ul.children[1], initial[48])
    assert.strictEqual(ul.children[48], initial[1])
    assert.strictEqual(ul.textContent, swapped.join(''))
  })

  it('does not rewrite unchanged attributes', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    const view = (text) => node('p', { class: { active: true }, style: { color: 'red' }, title: 'same' }, text)
    patch(view('a'))
    const paragraph = div.firstChild
    let writes = 0
    const setAttribute = paragraph.setAttribute
    paragraph.setAttribute = function (...args) {
      writes++
      return setAttribute.apply(this, args)
    }

    patch(view('b'))

    assert.strictEqual(paragraph.textContent, 'b')
    assert.strictEqual(writes, 0)
    assert.strictEqual(paragraph.className, 'active')
  })

  it('compares attributes with the previous render', () => {
    const div = document.createElement('div')
    div.innerHTML = '<p class="old" title="kept" data-id="1"></p>'
    const paragraph = div.firstChild
    let writes = 0
    const setAttribute = paragraph.setAttribute
    paragraph.setAttribute = function (...args) {
      writes++
      return setAttribute.apply(this, args)
    }
    const patch = prepare(div)

    patch(node('p', { class: { new: true }, title: 'kept', 'data-id': 1 }))
    assert.strictEqual(paragraph.outerHTML, '<p class="new" title="kept" data-id="1"></p>')
    assert.strictEqual(writes, 1)

    patch(node('p', { class: ['new'], title: 'kept', 'data-id': '1' }))
    assert.strictEqual(writes, 1)

    patch(node('p', { class: { new: false, other: true }, title: 'kept', 'data-id': 2 }))
    assert.strictEqual(paragraph.outerHTML, '<p class="other" title="kept" data-id="2"></p>')
    assert.strictEqual(writes, 3)
  })

  it('ignores inherited attributes and styles', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    Object.prototype.title = 'polluted'
    Object.prototype.color = 'red'
    try {
      patch(node('p', { id: 'a', style: { margin: '0' } }))
      patch(node('p', { id: 'b', style: { padding: '0' } }))
    } finally {
      delete Object.prototype.title
      delete Object.prototype.color
    }
    assert.strictEqual(div.innerHTML, '<p id="b" style="padding: 0px;"></p>')
  })

  it('creates and updates single text children', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    patch([node('p', ['']), node('p', 'a'), node('p', '0')])
    assert.strictEqual(div.innerHTML, '<p></p><p>a</p><p>0</p>')
    assert.strictEqual(div.firstChild.childNodes.length, 1)
    patch([node('p', 'x'), node('p', 'b'), node('p', [node('span', 'c')])])
    assert.strictEqual(div.innerHTML, '<p>x</p><p>b</p><p><span>c</span></p>')
  })

  it('keeps a shared keyed suffix in place', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    const view = (keys) => node('ul', keys.map((key) => node('li', { key }, key)))
    patch(view(['a', 'b', 'c', 'd']))
    const [a, b, c, d] = div.firstChild.children

    patch(view(['a', 'c', 'b', 'x', 'd']))
    assert.strictEqual(div.innerHTML, '<ul><li>a</li><li>c</li><li>b</li><li>x</li><li>d</li></ul>')
    assert.deepStrictEqual([...div.firstChild.children].filter((child) => child.textContent !== 'x'), [a, c, b, d])

    patch(view(['y', 'a', 'c', 'b', 'x', 'd']))
    assert.strictEqual(div.firstChild.children[1], a)
    patch(view(['y', 'a', 'b', 'x', 'd']))
    assert.strictEqual(div.innerHTML, '<ul><li>y</li><li>a</li><li>b</li><li>x</li><li>d</li></ul>')
    assert.strictEqual(div.firstChild.lastChild, d)
  })

  it('removes styles set to false and supports style arrays', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    patch(node('p', { style: { color: 'red', marginTop: '1px' } }))
    patch(node('p', { style: { color: false, marginTop: '1px' } }))
    assert.strictEqual(div.firstChild.style.color, '')
    assert.strictEqual(div.firstChild.style.marginTop, '1px')

    patch(node('p', { style: ['color:blue', 'margin:0'] }))
    assert.strictEqual(div.firstChild.style.color, 'blue')
    patch(node('p', { style: { padding: '0' } }))
    assert.strictEqual(div.firstChild.style.color, '')
    assert.strictEqual(div.firstChild.style.padding, '0px')
  })

  it('swaps and removes event listeners', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    const calls = []
    function first() { calls.push(['a', this]) }
    const second = () => calls.push(['b'])
    patch(node('button', { click: first }))
    const button = div.firstChild

    button.click()
    patch(node('button', { click: second }))
    button.click()
    patch(node('button'))
    button.click()

    assert.deepStrictEqual(calls, [['a', button], ['b']])
  })

  it('keeps input values controlled', () => {
    const div = document.createElement('div')
    const patch = prepare(div)
    patch(node('input', { value: 'state' }))
    const input = div.firstChild

    input.value = 'typed'
    patch(node('input', { value: 'state' }))

    assert.strictEqual(input.value, 'state')
  })

  it('sets classes on SVG elements', () => {
    const div = document.createElement('div')
    prepare(div)(node('svg', { class: ['icon', 'large'] }))

    assert.strictEqual(div.firstChild.getAttribute('class'), 'icon large')
  })

  it('hydrates existing content that contains comments and reuses elements', () => {
    const div = document.createElement('div')
    div.innerHTML = '<!-- server --><ul class="list"><li>one</li></ul>'
    const ul = div.querySelector('ul')

    prepare(div)(node('ul', { class: 'list' }, [node('li', 'one'), node('li', 'two')]))

    assert.strictEqual(div.firstChild, ul)
    assert.strictEqual(div.innerHTML, '<ul class="list"><li>one</li><li>two</li></ul>')
  })
})
