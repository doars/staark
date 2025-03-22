import {
  node,
} from './node.js'
import {
  selectorToTokenizer,
} from './selector.js'

/**
 * @typedef {import('./node.js').NodeAbstract} NodeAbstract
 * @typedef {import('./node.js').NodeAttributes} NodeAttributes
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {function(string=, NodeContent[]|NodeContent=): NodeAbstract} Fctory Function that generates the a node with the given type.
 */

/**
 * @typedef {Object<string, Fctory>} FctoryCache Factory cache.
 */

export const fctory = new Proxy({}, {
  /**
   * @param {FctoryCache} target Factory cache.
   * @param {string} type Type of the nodes to generate.
   * @returns {Fctory} Function that generates the a node with the given type.
   */
  get: (target, type) => {
    if (target[type]) {
      return target[type]
    }

    const typeConverted = (
      type[0] + type.substring(1)
        .replace(
          /([A-Z])/g,
          capital => '-' + capital,
        )
    ).toUpperCase()

    return target[type] = (
      selector,
      contents,
    ) => {
      let attributes
      if (selector) {
        const [_, _attributes] = selectorToTokenizer(selector)
        attributes = _attributes
      }
      return node(
        typeConverted,
        attributes,
        contents,
      )
    }
  },
})
