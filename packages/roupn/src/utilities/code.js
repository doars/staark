/**
 * A string containing the allowed characters for generating identifiers.
 * @type {string}
 */
export const ALPHANUMERIC_CHARACTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * A string containing the allowed characters for generating codes. Excludes easily confused characters such as 'I', 'O', 'L', '1', and '0'.
 * @type {string}
 */
export const IDENTIFIABLE_CHARACTERS = 'ABCDEFGHKMNPQRSTUVWXYZ23456789'

/**
 * Generates a random code string of the specified length.
 *
 * @param {number} [length=6] - The length of the code to generate.
 * @param {string} [characters='ABCDEFGHKMNPQRSTUVWXYZ23456789'] - The characters the code can consist of.
 * @returns {string} A randomly generated code.
 */
export const generateCode = (
  length = 24,
  characters = ALPHANUMERIC_CHARACTERS,
) => {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += characters.charAt(
      Math.floor(
        Math.random()
        * characters.length
      ),
    )
  }
  return code
}
