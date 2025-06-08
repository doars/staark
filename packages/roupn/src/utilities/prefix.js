export const PREFIX = '['
export const SUFFIX = ']'
export const INFIX = ':'

export const ROOM_PREFIX = 'R'
export const SERVER_PREFIX = 'S'
export const USER_ENCRYPTION_PREFIX = 'P'
export const SHARED_ENCRYPTION_PREFIX = 'E'

export const TIME_PAYLOAD = 'T'
export const USER_PAYLOAD = 'U'
export const INITIALIZATION_VECTOR_PAYLOAD = 'V'

const PREFIXES = [
  ROOM_PREFIX,
  SERVER_PREFIX,
]

export const prefix = (
  payload,
  prefix,
) => prefix + INFIX + payload

export const hasPrefix = (
  payload,
  prefix,
) => payload.startsWith(prefix + INFIX)

export const getPrefix = (
  payload,
) => (
  payload[1] === INFIX
    && PREFIXES.indexOf(payload[0]) >= 0
    ? [payload[0], payload.substring(2)]
    : [null, payload]
)

export const trimPrefix = (
  payload,
  prefix,
) => (
  payload
    && payload.startsWith(prefix + INFIX)
    ? payload.substring(
      prefix.length + 1,
    )
    : null
)

export const hasPayload = (
  payload,
  prefix,
) => payload.startsWith(PREFIX + prefix + INFIX)

export const splitPayload = (
  payload,
  prefix,
  limit = 14,
  characterFilter = null,
  convertResult = null,
) => {
  if (hasPayload(payload, prefix)) {
    // Start after prefix.
    let index = PREFIX.length + prefix.length + INFIX.length
    let result = ''
    const length = payload.length
    // Loop until we find the suffix or reach a reasonable limit.
    for (; index < length && result.length < limit; index++) {
      const character = payload[index]
      if (character === SUFFIX) {
        // Found end of payload.
        return [
          convertResult ? convertResult(result) : result,
          payload.slice(index + 1),
        ]
      }
      // Stop in case an unmatched character is found.
      if (
        characterFilter
        && !characterFilter(character)
      ) {
        break
      }
      result += character
    }
  }
  return [
    null,
    payload,
  ]
}

export const splitInitializationVector = (
  payload,
) => splitPayload(
  payload,
  INITIALIZATION_VECTOR_PAYLOAD,
)

export const splitUserId = (
  payload,
) => splitPayload(
  payload,
  USER_PAYLOAD,
  36,
  (character) => (
    (character >= '0' && character <= '9')
    || (character >= 'a' && character <= 'f')
    || (character >= 'A' && character <= 'F')
    || character === '-'
  ),
)

export const wrapPayload = (
  payload,
  prefix,
) => PREFIX + prefix + INFIX + payload + SUFFIX
