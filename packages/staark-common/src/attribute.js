const SUFFIX_MULTIPLE = '[]'

/**
 * @typedef {Object} MultipleAttributes
 * @property {boolean} [multiple]
 * @property {string} [name]
 */

/**
 * Suffixes the name with '[]' if the multiple attribute is true and the name does not already end with '[]'.
 * @param {MultipleAttributes} attributes
 */
export const suffixNameIfMultiple = (attributes) => {
  if (
    attributes.multiple
    && attributes.name
    && !attributes.name.endsWith(SUFFIX_MULTIPLE)
  ) {
    attributes.name += SUFFIX_MULTIPLE
  }
}
