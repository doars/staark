import {
  node,
} from './node.js'

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Object} Attribute
 * @property {string} name
 * @property {string} value
 */

/**
 * Converts child nodes of an element to an array of abstract nodes.
 * @param {Element | ChildNode} element
 * @returns {NodeContent[]}
 */
export const childrenToNodes = (
  element,
) => {
  const abstractChildNodes = []
  for (const childNode of element.childNodes) {
    if (childNode instanceof Text) {
      abstractChildNodes.push(
        childNode.textContent ?? '',
      )
    } else {
      const attributes = {}
      for (const attribute of childNode.attributes) {
        attributes[attribute.name] = attribute.value
      }

      abstractChildNodes.push(
        node(
          childNode.nodeName,
          attributes,
          childrenToNodes(childNode),
        ),
      )
    }
  }
  return abstractChildNodes
}
