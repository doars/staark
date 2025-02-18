type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Ensure the data is an array of not already. Non-truthy values are converted to empty arrays.
 * @param data Data to arrify
 * @returns An array with the data.
 */
export const arrayify = <T>(
  data: T[] | T,
): NonNullable<T>[] => arrayifyOrUndefined(data) ?? []

/**
 * Ensure the data is an array of not already. Non-truthy values are converted to undefined.
 * @param data Data to arrify
 * @returns An array with the data or undefined.
 */
export const arrayifyOrUndefined = <T>(
  data: T[] | T,
): NonNullable<T>[] | undefined => (
  data
    ? Array.isArray(data)
      ? data :
      [data,]
    : undefined
) as NonNullable<T>[] | undefined
