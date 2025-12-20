import { describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'

import {
    mount,
    node,
} from '../../src/index.js'

const window = new Window()
globalThis.window = window
globalThis.document = window.document

describe('SVG', () => {
  it('should render SVG elements', () => {
    const app = document.createElement('div')
    mount(app, () =>
      node('svg', {
        height: '100px',
        width: '100px',
        viewBox: '0 0 100 100',
        xmlns: 'http://www.w3.org/2000/svg',
      }, [
        node('path', {
          d: 'M0,0 L50,50 L0,50 Z',
          stroke: '#0ff',
          fill: '#ff0',
          'stroke-width': '2',
        }),
        node('path', {
          d: 'M50,50 L100,50 L50,100 Z',
          stroke: '#f0f',
          fill: '#0ff',
          'stroke-width': '2',
        }),
      ]),
    )
    expect(app.innerHTML).toBe('<svg height="100px" width="100px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L50,50 L0,50 Z" stroke="#0ff" fill="#ff0" stroke-width="2"></path><path d="M50,50 L100,50 L50,100 Z" stroke="#f0f" fill="#0ff" stroke-width="2"></path></svg>')
  })
})
