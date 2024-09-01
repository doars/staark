export const arrayify = function <T>(
  data: T[] | T,
): T[] {
  if (Array.isArray(data)) {
    return data
  }
  return [
    data,
  ]
}
