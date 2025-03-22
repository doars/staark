/**
 * Delays the execution for a specified amount of time.
 *
 * @param {number} time The amount of time to delay in milliseconds.
 * @returns {Promise<null>} A promise that resolves after the delay.
 */
export const delay = async (
  time,
) => {
  if (time > 0) {
    return new Promise(
      (resolve) => setTimeout(resolve, time),
    )
  }
  return null
}
