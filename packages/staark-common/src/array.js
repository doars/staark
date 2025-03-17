/**
 * Ensure the data is an array if it isn't already. Non-truthy values are converted to empty arrays.
 *
 * @template T
 * @param {T|T[]} data - Data to "arrify".
 * @returns {T[]} An array containing the data.
 */
export const arrayify = (
  data,
) => arrayifyOrUndefined(data) || []

/**
 * Ensure the data is an array if it isn't already. Non-truthy values are converted to undefined.
 *
 * @template T
 * @param {T|T[]} data - Data to "arrify".
 * @returns {(T[]|undefined)} An array containing the data or undefined.
 */
export const arrayifyOrUndefined = (
  data,
) => data ? (
  Array.isArray(data)
    ? data
    : [data]
) : undefined
