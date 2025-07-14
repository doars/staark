export const bufferToBase64 = (
  buffer,
) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const byteLength = bytes.byteLength
  for (let i = 0; i < byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export const base64ToBuffer = (
  base64,
) => {
  const binaryString = window.atob(base64)
  const stringLength = binaryString.length
  const bytes = new Uint8Array(stringLength)
  for (let i = 0; i < stringLength; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
