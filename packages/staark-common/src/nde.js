import { arrayifyOrUndefined } from './array.js'
import { marker } from './marker.js'
import { selectorToTokenizer } from './selector.js'

/**
 * @typedef {import('./node.js').NodeAbstract} NodeAbstract
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * Creates a NodeAbstract object from a selector and contents.
 *
 * @param {string} selector The selector string.
 * @param {NodeContent[] | NodeContent} [contents] Abstracts of children.
 * @returns {NodeAbstract} Node abstract representing the given data.
 */
export const nde = (
  selector,
  contents,
) => {
  const [type, attributes] = selectorToTokenizer(selector)

  return {
    _: marker,
    a: attributes,
    c: arrayifyOrUndefined(contents),
    t: type,
  }
}
