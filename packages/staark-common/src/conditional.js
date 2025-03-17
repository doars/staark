import { arrayify } from './array.js'

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 * @typedef {import('./types.js').ResolveFunction} ResolveFunction
 */

/**
 * @param {any} condition - The condition to evaluate.
 * @param {NodeContent[] | NodeContent | ResolveFunction} onTruth - The content to return if the condition is true.
 * @param {NodeContent[] | NodeContent | ResolveFunction} [onFalse] - The content to return if the condition is false.
 * @returns {NodeContent[]} - The resulting content as an array.
 */
export const conditional = (
  condition,
  onTruth,
  onFalse,
) => {
  let result = (
    condition
      ? onTruth
      : onFalse
  )
  if (typeof (result) === 'function') {
    result = result()
  }
  return arrayify(result)
}
