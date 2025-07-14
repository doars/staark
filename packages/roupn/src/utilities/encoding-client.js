export const base64ToBuffer = (
  base64,
) => {
  console.trace('base64ToBuffer', base64)
  const binary = atob(base64)
  const length = binary.length
  const buffer = new ArrayBuffer(length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

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

export const stringToBase64 = (
  string,
) => {
  const bytes = new TextEncoder().encode(string)
  let binary = ''
  bytes.forEach(byte => binary += String.fromCharCode(byte))
  return btoa(binary)
}

export const bufferToBase64 = (
  buffer,
) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(byte => binary += String.fromCharCode(byte))
  return btoa(binary)
}
