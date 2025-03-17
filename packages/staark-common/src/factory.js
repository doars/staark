import {
  node,
} from './node.js'

/**
 * @typedef {import('./node.js').NodeAbstract} NodeAbstract
 * @typedef {import('./node.js').NodeAttributes} NodeAttributes
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Function} Factory
 * @param {NodeAttributes | NodeContent[] | NodeContent} [attributesOrContents]
 * @param {NodeContent[] | NodeContent} [contents]
 * @returns {NodeAbstract}
 */

/**
 * @typedef {Object} FactoryCache
 */

export const factory = new Proxy({}, {
  /**
   * @param {FactoryCache} target
   * @param {string} type
   * @returns {Factory}
   */
  get: (
    target,
    type,
  ) => {
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
      attributesOrContents,
      contents,
    ) => node(
      typeConverted,
      attributesOrContents,
      contents,
    )
  },
})
