import { describe, expect, it } from 'bun:test'
import { Text, Window } from 'happy-dom'

import {
  childrenToNodes,
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
      expect(result).toEqual(['Hello World'])
    })

    it('should convert element nodes to node objects', () => {
      const mockElement = document.createElement('div')
      const mockChildElement = document.createElement('div')
      mockChildElement.setAttribute('class', 'test')
      mockElement.appendChild(mockChildElement)

      const result = childrenToNodes(mockElement)
      expect(result).toHaveLength(1)
      expect(result[0].t).toBe('DIV')
      expect(result[0].a).toEqual({ class: 'test' })
      expect(result[0].c).toEqual([])
    })

    it('should handle mixed child nodes', () => {
      const mockElement = document.createElement('div')
      const mockText = document.createTextNode('Hello World')
      mockElement.appendChild(mockText)
      const mockChildElement = document.createElement('span')
      mockElement.appendChild(mockChildElement)

      const result = childrenToNodes(mockElement)
      expect(result).toHaveLength(2)
      expect(result[0]).toBe('Hello World')
      expect(result[1].t).toBe('SPAN')
    })

    it('should handle empty childNodes', () => {
      const mockElement = document.createElement('div')

      const result = childrenToNodes(mockElement)
      expect(result).toEqual([])
    })
  })
})
