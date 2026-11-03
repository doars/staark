import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'
import { Text, Window } from 'happy-dom'

import {
  childrenToNodes,
  setStyle,
} from '../../src/index.js'

const window = new Window()
globalThis.document = window.document
globalThis.Text = Text

describe('Element', () => {
  describe('childrenToNodes', () => {
    it('should convert text nodes to strings', () => {
      const mockElement = document.createElement('div')
      const mockText = document.createTextNode('Hello World')
      mockElement.appendChild(mockText)

      const result = childrenToNodes(mockElement)
      assert.deepStrictEqual(result, ['Hello World'])
    })

    it('should convert element nodes to node objects', () => {
      const mockElement = document.createElement('div')
      const mockChildElement = document.createElement('div')
      mockChildElement.setAttribute('class', 'test')
      mockElement.appendChild(mockChildElement)

      const result = childrenToNodes(mockElement)
      assert.strictEqual(result.length, 1)
      assert.strictEqual(result[0].t, 'div')
      assert.deepStrictEqual(result[0].a, { class: 'test' })
      assert.deepStrictEqual(result[0].c, [])
    })

    it('should handle mixed child nodes', () => {
      const mockElement = document.createElement('div')
      const mockText = document.createTextNode('Hello World')
      mockElement.appendChild(mockText)
      const mockChildElement = document.createElement('span')
      mockElement.appendChild(mockChildElement)

      const result = childrenToNodes(mockElement)
      assert.strictEqual(result.length, 2)
      assert.strictEqual(result[0], 'Hello World')
      assert.strictEqual(result[1].t, 'span')
    })

    it('should handle empty childNodes', () => {
      const mockElement = document.createElement('div')

      const result = childrenToNodes(mockElement)
      assert.deepStrictEqual(result, [])
    })
  
    it('should convert comments without attributes', () => {
      const mockElement = document.createElement('div')
      mockElement.innerHTML = '<!-- note --><svg><linearGradient></linearGradient></svg>'

      const result = childrenToNodes(mockElement)
      assert.strictEqual(result[0].t, '#comment')
      assert.deepStrictEqual(result[0].a, {})
      assert.strictEqual(result[1].t, 'svg')
      assert.strictEqual(result[1].c[0].t, 'linearGradient')
    })
  })

  describe('setStyle', () => {
    it('sets and removes camel cased and hyphenated properties', () => {
      const element = document.createElement('div')
      setStyle(element, 'backgroundColor', 'red')
      setStyle(element, 'font-size', '12px')
      setStyle(element, '--gap', '4px')
      assert.strictEqual(element.style.backgroundColor, 'red')
      assert.strictEqual(element.style.fontSize, '12px')
      assert.strictEqual(element.style.getPropertyValue('--gap'), '4px')

      setStyle(element, 'backgroundColor', '')
      setStyle(element, 'font-size', '')
      setStyle(element, '--gap', '')
      assert.strictEqual(element.style.cssText, '')
    })
  })
})
