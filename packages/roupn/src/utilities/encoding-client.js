
export const base64ToBuffer = (
  base64,
) => {
  console.log('base64ToBuffer', base64)
  const binary = atob(base64)
  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0),
  ).buffer
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
