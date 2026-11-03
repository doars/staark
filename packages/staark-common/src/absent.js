/**
 * Checks whether a value means that something is absent, such as an attribute that is not set or a node without contents. Only `null`, `undefined`, and `false` are absent, other falsy values such as `0` and `""` are not.
 *
 * @param {any} value Value to check.
 * @returns {boolean} Whether the value is absent.
 */
export const isAbsent = (value) =>
	value === null || value === undefined || value === false;
