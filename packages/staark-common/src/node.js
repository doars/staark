import { arrayifyOrUndefined } from './array.js'
import { marker } from './marker.js'

/**
 * @typedef {import('./memo.js').MemoAbstract} MemoAbstract
 */

/**
 * @typedef {function(Event, Record<string, any>): unknown} NodeAttributeListener
 * @property {function(Event, Record<string, any>): unknown} [f]
 */

/**
 * @typedef {Object.<string, boolean | null | number | string | (number | string)[] | NodeAttributeListener | Record<string, boolean | number | string>>} NodeAttributes
 */

/**
 * @typedef {string | MemoAbstract | NodeAbstract} NodeContent
 */

/**
 * @typedef {Object} NodeAbstract
 * @property {string} _ - Discriminator
 * @property {NodeAttributes} [a] - Attributes
 * @property {NodeContent[]} [c] - Content
 * @property {string} t - Node type
 */

/**
 * @param {string} type
 * @param {NodeAttributes | NodeContent[] | NodeContent} [attributesOrContents]
 * @param {NodeContent[] | NodeContent} [contents]
 * @returns {NodeAbstract}
 */
export const node = (
  type,
  attributesOrContents,
  contents,
) => {
  if (
    typeof (attributesOrContents) !== 'object'
    || attributesOrContents._ === marker
    || Array.isArray(attributesOrContents)
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
