let identifierCount = 0

/**
 * Generates a unique identifier with a given prefix.
 * @param {string} prefix The prefix for the identifier.
 * @returns {string} The generated identifier.
 */
export const identifier = (
  prefix,
) => prefix + '-' + (identifierCount++)
