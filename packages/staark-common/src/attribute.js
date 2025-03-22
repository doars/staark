const SUFFIX_MULTIPLE = '[]'

/**
 * @typedef {Object} MultipleAttributesAttributes that can be multiple.
 * @property {boolean} [multiple] Whether the attribute can be multiple.
 * @property {string} [name] The name of the attribute.
 */

/**
 * Suffixes the name with '[]' if the multiple attribute is true and the name does not already end with '[]'.
 *
 * @param {MultipleAttributes} attributes The attributes object to check mutate.
 */
export const suffixNameIfMultiple = (
  attributes,
) => {
  if (
    attributes.multiple
    && attributes.name
    && !attributes.name.endsWith(SUFFIX_MULTIPLE)
  ) {
    attributes.name += SUFFIX_MULTIPLE
  }
}
