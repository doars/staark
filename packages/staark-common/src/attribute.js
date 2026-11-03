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
 * Converts an attribute value to the string written to the DOM. Class objects and arrays are joined into a list of class names, and style arrays into a list of declarations.
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
			: name === "style" && Array.isArray(value)
				? value.join(";")
				: `${value}`;

/**
 * Converts the value of a style property to the string written to the DOM. Arrays are joined with spaces, and `null`, `undefined`, and `false` become an empty string, which removes the property.
 *
 * @param {any} value Value of the style property.
 * @returns {string} The style value as a string.
 */
export const styleValueToString = (value) =>
	value === null || value === undefined || value === false
		? ""
		: Array.isArray(value)
			? value.join(" ")
			: `${value}`;

/**
 * Converts a style object to a list of declarations, as used when rendering to a string. Camel-case property names are hyphenated, and properties whose value is `null`, `undefined`, or `false` are left out.
 *
 * @param {Record<string, any>} style Style properties.
 * @returns {string} The style as a string.
 */
export const styleToString = (style) => {
	const declarations = [];
	for (const name of Object.keys(style)) {
		const value = styleValueToString(style[name]);
		if (value) {
			declarations.push(
				`${name.includes("-") ? name : name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)}:${value}`,
			);
		}
	}
	return declarations.join(";");
};
