const DELIMITER = '|'
const INFIX = ':'

export const encode = (
  parts,
  stringToBase64,
) => {
  const segments = []
  for (const key in parts) {
    const value = parts[key]
    if (
      value !== null
      && value !== undefined
    ) {
      segments.push(key + INFIX + stringToBase64(
        String(value)),
      )
    }
  }
  return segments.join(DELIMITER)
}

export const decode = (
  message,
  base64ToString,
) => {
  const parts = {}
  const segments = message.split(DELIMITER)
  for (const segment of segments) {
    const index = segment.indexOf(INFIX)
    if (index > 0) {
      const key = segment.substring(0, index)
      const value = segment.substring(index + 1)
      parts[key] = base64ToString(value)
    }
  }
  return parts
}
