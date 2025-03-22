import {
  node,
} from './node.js'

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Object} Attribute An attribute of an element.
 * @property {string} name The name of the attribute.
 * @property {string} value The value of the attribute.
 */

/**
 * Converts child nodes of an element to an array of abstract nodes.
 * @param {Element | ChildNode} element The element to convert.
 * @returns {NodeContent[]} The abstract nodes that are equivalent to the given element's child nodes.
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
