export const PREFIX = '['
export const SUFFIX = ']'
export const INFIX = ':'

export const ROOM_PREFIX = 'R'
export const SERVER_PREFIX = 'S'
export const USER_ENCRYPTION_PREFIX = 'P'
export const SHARED_ENCRYPTION_PREFIX = 'E'

export const TIME_PAYLOAD = 'T'
export const USER_PAYLOAD = 'U'
export const SIGNATURE_PAYLOAD = 'H'
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
  convertResult = null,
) => {
  if (hasPayload(payload, prefix)) {
    const startIndex = PREFIX.length + prefix.length + INFIX.length
    const endIndex = payload.indexOf(SUFFIX, startIndex)
    if (endIndex !== -1) {
      const result = payload.substring(startIndex, endIndex)
      return [
        convertResult
          ? convertResult(result)
          : result,
        payload.slice(endIndex + 1),
      ]
    }
  }
  return [
    null,
    payload,
  ]
}

export const wrapPayload = (
  payload,
  prefix,
) => PREFIX + prefix + INFIX + payload + SUFFIX
