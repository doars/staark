import { arrayifyOrUndefined } from './array.js'
import { marker } from './marker.js'

/**
 * @typedef {import('./memo.js').MemoAbstract} MemoAbstract
 */

/**
 * @typedef {function(Event, Record<string, any>): unknown} NodeAttributeListener Listener for node attribute.
 * @property {function(Event, Record<string, any>): unknown} [f] Function that was written to the DOM tree before being wrapped so it can be compared to.
 */

/**
 * @typedef {Object.<string, boolean | null | number | string | (number | string)[] | NodeAttributeListener | Record<string, boolean | number | string>>} NodeAttributes Attributes of a node.
 */

/**
 * @typedef {string | MemoAbstract | NodeAbstract} NodeContent Content of a node.
 */

/**
 * @typedef {Object} NodeAbstract Node abstract.
 * @property {string} _ Discriminator to differentiate from other objects.
 * @property {NodeAttributes} [a] Attributes of the node.
 * @property {NodeContent[]} [c] Abstracts of children.
 * @property {string} t Node type of the node.
 */

/**
 * Creates a NodeAbstract object.
 *
 * @param {string} type Type of the node.
 * @param {NodeAttributes | NodeContent[] | NodeContent} [attributesOrContents] Attributes of node or contents.
 * @param {NodeContent[] | NodeContent} [contents] Abstracts of children.
 * @returns {NodeAbstract} Node abstract representing the given data.
 */
export const node = (
  type,
  attributesOrContents,
  contents,
) => {
  if (
    attributesOrContents
    && (
      typeof (attributesOrContents) !== 'object'
      || attributesOrContents._ === marker
      || Array.isArray(attributesOrContents)
    )
  ) {
    contents = attributesOrContents
    attributesOrContents = undefined
  }

  return {
    _: marker,
    a: attributesOrContents,
    c: arrayifyOrUndefined(contents),
    t: type.toUpperCase(),
  }
}
