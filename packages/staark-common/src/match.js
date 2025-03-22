import { arrayify } from './array.js'

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 * @typedef {import('./types.js').ResolveFunction} ResolveFunction
 */

/**
 * Matches a key to a value in a lookup table, with a fallback option.
 *
 * @param {any} key The key to match.
 * @param {Record<any, NodeContent[] | NodeContent | ResolveFunction | null | undefined>} lookup The lookup table.
 * @param {NodeContent[] | NodeContent | ResolveFunction | null} [fallback] The fallback value.
 * @returns {NodeContent[]} The matched or fallback value, arrayified.
 */
export const match = (
  key,
  lookup,
  fallback,
) => {
  let result
  if (
    lookup
    && (key in lookup)
    && lookup[key]
  ) {
    result = lookup[key]
  } else {
    result = fallback
  }
  if (typeof result === 'function') {
    result = result()
  }
  return arrayify(result)
}
