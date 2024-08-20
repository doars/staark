export const delay = async (
  time: number,
): Promise<null> => {
  if (time > 0) {
    return new Promise(
      (resolve) => setTimeout(resolve, time)
    )
  }
  return null
}
