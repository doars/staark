export const arrayify = <T>(
  data: T[] | T,
): T[] => (
  Array.isArray(data)
    ? data :
    [data,]
)
