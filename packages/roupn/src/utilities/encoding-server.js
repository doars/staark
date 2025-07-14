export const base64ToString = (
  base64,
) => {
  return Buffer.from(base64, 'base64').toString('utf-8')
}

export const stringToBase64 = (
  string,
) => {
  return Buffer.from(string, 'utf-8').toString('base64')
}
