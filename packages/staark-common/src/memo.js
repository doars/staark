import { marker } from './marker.js'

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Object<string, any>} State State of the application.
 */

/**
 * @typedef {function(State, any): NodeContent[] | NodeContent} MemoFunction Render function to generated abstract tree.
 */

/**
 * @typedef {Object} MemoAbstract
 * @property {string} _ Discriminator to differentiate from other objects.
 * @property {any} m Remembered data to compare with.
 * @property {MemoFunction} r Render function to generated abstract tree.
 */

/**
 * Creates a MemoAbstract object.
 *
 * @param {MemoFunction} render Render function to generated abstract tree.
 * @param {any} memory Remembered data to compare with.
 * @returns {MemoAbstract} Memo abstract object.
 */
export const memo = (
  render,
  memory,
) => ({
  _: marker,
  r: render,
  m: memory,
})
