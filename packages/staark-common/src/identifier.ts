let identifierCount = 0
export const identifier = (
  prefix: string,
): string => prefix + '-' + (identifierCount++)
