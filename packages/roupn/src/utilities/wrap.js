export const PREFIX = '['
export const SUFFIX = ']'
export const INFIX = ']'

export const SERVER_PREFIX = 'S'
export const TIME_PREFIX = 'T'

export const wrap = (
  payload,
  prefix,
) => PREFIX + prefix + INFIX + payload + SUFFIX

export const unwrap = (
  payload,
  prefix,
) => (
  payload
    && payload.startsWith(PREFIX + prefix + INFIX)
    && payload.endsWith(SUFFIX)
    ? payload.substring(
      prefix.length + 2,
      payload.length - prefix.length - 3,
    )
    : null
)
