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
} from '../../../staark/src/index.js'
import {
  prepare,
} from '../../../staark-patch/src/index.js'
import {
  stringifyFull,
  stringifyPatchFull,
} from '../../src/index.js'

/**
 * Serialize the DOM with styles normalized, so a parsed style string and styles set through the DOM compare equal.
 */
const serialize = (element) => {
  const copy = element.cloneNode(true)
  for (const child of copy.querySelectorAll('[style]')) {
    child.setAttribute('style', child.style.cssText)
    if (!child.getAttribute('style')) {
      child.removeAttribute('style')
    }
  }
  return copy.innerHTML
}

const renderItem = (_state, item) => node('li', { key: item.id }, item.text)
const renderEmpty = () => null

const cases = {
  attributes: {
    view: (state) => node('p', {
      class: { active: state.active, hidden: !state.active },
      'data-count': state.count,
      hidden: !state.active,
      key: 'paragraph',
      click: () => {},
      style: { color: 'red', marginTop: state.active ? '1px' : false, '--custom': [1, 2] },
      title: state.title,
    }, 'text'),
    state: { active: true, count: 0, title: 'a "title"' },
    update: (state) => {
      state.active = false
      state.count = 2
    },
  },
  'style arrays': {
    view: (state) => node('p', { style: state.style }, 'styled'),
    state: { style: ['color:red', 'margin:0'] },
    update: (state) => { state.style = ['color:blue'] },
  },
  text: {
    view: (state) => node('p', ['a', state.text, '', 'c', node('br'), 'd']),
    state: { text: 'b' },
    update: (state) => { state.text = 'B' },
  },
  memos: {
    // staark-patch does not support memos.
    patch: false,
    view: (state) => node('main', [
      node('ul', state.items.map((item) => memo(renderItem, item))),
      memo(renderEmpty, null),
      memo(() => node('b', 'static'), null),
    ]),
    state: { items: [{ id: 1, text: 'one' }, { id: 2, text: 'two' }] },
    update: (state) => {
      state.items.reverse()
      state.items[0].text = 'TWO'
    },
  },
  'void and empty elements': {
    view: (state) => node('form', [
      node('input', { value: state.value }),
      node('table', node('colgroup', node('col', { span: 2 }))),
      node('div'),
    ]),
    state: { value: 'a' },
    update: (state) => { state.value = 'b' },
  },
  svg: {
    view: (state) => node('svg', { viewBox: '0 0 2 2' }, node('circle', { r: state.radius })),
    state: { radius: 1 },
    update: (state) => { state.radius = 2 },
  },
}

describe('Hydrate stringified views', () => {
  for (const [name, { patch = true, view, state, update }] of Object.entries(cases)) {
    it(`matches a client render with mount: ${name}`, async () => {
      const client = document.createElement('div')
      const [updateClient, , clientState] = mount(client, view, structuredClone(state))

      const [html, abstractTree, serializedState] = stringifyFull(view, structuredClone(state))
      const server = document.createElement('div')
      server.innerHTML = html
      const elements = [...server.querySelectorAll('*')]
      const [updateServer, , serverState] = mount(server, view, serializedState, abstractTree)

      assert.strictEqual(serialize(server), serialize(client))
      for (const element of elements) {
        assert.ok(server.contains(element), `<${element.localName}> was recreated instead of hydrated`)
      }

      update(clientState)
      update(serverState)
      await updateClient()
      await updateServer()
      assert.strictEqual(serialize(server), serialize(client))
    })

    it(`matches a client render with patch: ${name}`, { skip: !patch }, () => {
      const client = document.createElement('div')
      prepare(client)(view(structuredClone(state)))

      const [html, abstractTree] = stringifyPatchFull(view(structuredClone(state)))
      const server = document.createElement('div')
      server.innerHTML = html
      const elements = [...server.querySelectorAll('*')]
      prepare(server, abstractTree)(view(structuredClone(state)))

      assert.strictEqual(serialize(server), serialize(client))
      for (const element of elements) {
        assert.ok(server.contains(element), `<${element.localName}> was recreated instead of hydrated`)
      }
    })
  }
})
