/**
 * Converts a base64-encoded string to an ArrayBuffer.
 *
 * @param {string} base64 - The base64-encoded string to convert.
 * @returns {ArrayBuffer} The decoded ArrayBuffer.
 */
export const base64ToBuffer = (
  base64,
) => {
  const binary = atob(base64)
  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0),
  ).buffer
}

/**
 * Converts a base64-encoded string to a UTF-8 string.
 *
 * @param {string} base64 - The base64-encoded string to convert.
 * @returns {string} The decoded UTF-8 string.
 */
export const base64ToString = (
  base64,
) => {
  const binary = atob(base64)
  const bytes = Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  )
  return new TextDecoder().decode(bytes)
}

/**
 * Converts a UTF-8 string to a base64-encoded string.
 *
 * @param {string} string - The UTF-8 string to encode.
 * @returns {string} The base64-encoded string.
 */
export const stringToBase64 = (
  string,
) => {
  const bytes = new TextEncoder().encode(string)

  if (bytes.length < 65536) {
    return btoa(
      String.fromCharCode(...bytes),
    )
  }

  let binary = ''
  const chunkSize = 65536
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

/**
 * Converts an ArrayBuffer to a base64-encoded string.
 *
 * @param {ArrayBuffer} buffer - The ArrayBuffer to encode.
 * @returns {string} The base64-encoded string.
 */
export const bufferToBase64 = (
  buffer,
) => {
  const bytes = new Uint8Array(buffer)

  if (bytes.length < 65536) {
    return btoa(
      String.fromCharCode(...bytes),
    )
  }

  let binary = ''
  const chunkSize = 65536
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}
