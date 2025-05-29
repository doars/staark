/**
 * Calculates time synchronization values based on provided server and sender times.
 *
 * @param {string} serverTime - The date and time the server broadcasted the data.
 * @param {string} senderTime - The date and time the sender send the data.
 * @returns {{
 *   delay: number,
 *   offset: number,
 *   adjusted: number,
 * }} An object containing the calculated delay, offset, and adjusted time.
 */
export const calculateTime = (
  serverTime,
  senderTime,
) => {
  const receiverTime = Date.now()

  if (!serverTime) {
    return {
      delay: 0,
      offset: 0,
      adjusted: receiverTime,
    }
  }

  if (!senderTime) {
    const offset = serverTime - receiverTime
    return {
      delay: 0,
      offset: offset,
      adjusted: (
        receiverTime
        + offset
      )
    }
  }

  const delay = receiverTime - senderTime
  const offset = (
    (serverTime - senderTime)
    + (serverTime - receiverTime)
  ) / 2
  return {
    delay: delay,
    offset: offset,
    adjusted: (
      receiverTime
      - delay
      + offset
    ),
  }
}
