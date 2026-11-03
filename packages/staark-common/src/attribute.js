const SUFFIX_MULTIPLE = "[]";

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
export const suffixNameIfMultiple = (attributes) => {
	if (
		attributes.multiple &&
		attributes.name &&
		!attributes.name.endsWith(SUFFIX_MULTIPLE)
	) {
		attributes.name += SUFFIX_MULTIPLE;
	}
};

/**
 * Converts an attribute value to the string written to the DOM. Class objects and arrays are joined into a list of class names.
 *
 * @param {string} name Name of the attribute.
 * @param {any} value Value of the attribute.
 * @returns {string} The attribute value as a string.
 */
export const attributeToString = (name, value) =>
	typeof value === "string"
		? value
		: name === "class" && typeof value === "object"
			? Array.isArray(value)
				? value.join(" ")
				: Object.keys(value)
						.filter((className) => value[className])
						.join(" ")
			: `${value}`;
