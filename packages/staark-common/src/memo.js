import { marker } from './marker.js'

/**
 * @typedef {Object<string, any>} State
 */

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {function(State, any): NodeContent[] | NodeContent} MemoFunction
 */

/**
 * @typedef {Object} MemoAbstract
 * @property {string} _ - Marker
 * @property {any} m - Memory
 * @property {MemoFunction} r - Render function
 */

/**
 * @param {MemoFunction} render
 * @param {any} memory
 * @returns {MemoAbstract}
 */
export const memo = (
  render,
  memory,
) => ({
  _: marker,
  r: render,
  m: memory,
})
