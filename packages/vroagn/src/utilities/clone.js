/**
 * Creates a deep clone of a javascript value.
 *
 * @param {any} value Data to clone.
 * @param {WeakMap<object, any>} [clones] Previously cloned values.
 * @returns {any} Clone of the data.
 */
export const cloneRecursive = (value, clones = new WeakMap()) => {
	if (!value || typeof value !== "object") {
		return value;
	}
	const prototype = Object.getPrototypeOf(value);
	if (
		!Array.isArray(value) &&
		prototype !== Object.prototype &&
		prototype !== null
	) {
		return value;
	}
	if (clones.has(value)) {
		return clones.get(value);
	}
	const clone = Array.isArray(value) ? [] : Object.create(prototype);
	clones.set(value, clone);
	for (const key of Object.keys(value)) {
		clone[key] = cloneRecursive(value[key], clones);
	}
	return clone;
};
