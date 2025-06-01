import {
  INFIX,
  SUFFIX,
  TIME_PREFIX,
} from './wrap.js'

/**
 * Prefixes the given payload with the current timestamp in milliseconds.
 *
 * @param {string} payload - The string to be prefixed with the timestamp.
 * @returns {string} The payload prefixed with '[T:<timestamp>]' where <timestamp> is the current time in milliseconds.
 */
export const prefixTime = (
  payload,
) => wrap(
  Date.now(),
  TIME_PREFIX,
) + payload

/**
 * Splits a time-prefixed string of the format '[T:<digits>]<rest>' into its numeric time value and the remaining string.
 *
 * @param {string} payload - The input string to split, expected to start with '[T:' followed by digits and a closing ']'.
 * @returns {[number|null, string]} A tuple where the first element is the parsed time as a number (or null if not found), and the second element is the remaining string after the time prefix.
 */
export const splitTime = (
  payload,
) => {
  if (
    payload
    && payload.startsWith(PREFIX + TIME_PREFIX + INFIX)
  ) {
    // Start after TIME_PREFIX.
    let index = TIME_PREFIX.length + 2
    let timeString = ''
    const length = payload.length
    // Loop until we find SUFFIX or reach a reasonable limit.
    for (; index < length && timeString.length < 14; index++) {
      const character = payload[index]
      if (character === SUFFIX) {
        // Found end of time prefix
        return [
          Number(timeString),
          payload.slice(index + 1),
        ]
      }
      // Stop in case a non-numeric character is found.
      if (isNaN(character)) {
        break
      }
      timeString += character
    }
  }
  return [
    null,
    payload,
  ]
}

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
      ),
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
