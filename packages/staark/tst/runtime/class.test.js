import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.Element = window.Element

import {
    mount,
    node,
} from '../../src/index.js'

describe('Class', () => {
  it('should handle class attributes in different formats', () => {
    const app = document.createElement('div')
    mount(app, () => [
      node('div', {
        class: 'class-string',
      }, 'class string'),
      node('div', {
        class: [
          'class',
          'array',
        ],
      }, 'class array'),
      node('div', {
        class: {
          class: true,
          object: 'truthy',
          disabled: false,
        },
      }, 'class object'),
    ])

    const divs = app.querySelectorAll('div')
    expect(divs[0].className).toBe('class-string')
    expect(divs[1].className).toBe('class array')
    expect(divs[2].className).toBe(' class object')
  })
})
