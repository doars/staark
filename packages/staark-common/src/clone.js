/**
 * Creates a deep clone of a JavaScript value.
 *
 * @param {any} value Data to clone.
 * @param {WeakMap<object, any>} [clones] Previously cloned values.
 * @returns {any} Clone of the data.
 */
export const cloneRecursive = (value, clones = new WeakMap()) => {
	if (!value || typeof value !== "object") {
		return value;
	}
	if (clones.has(value)) {
		return clones.get(value);
	}

	if (value instanceof Date) {
		const clone = new Date(value.getTime());
		clones.set(value, clone);
		return clone;
	}
	if (value instanceof Map) {
		const clone = new Map();
		clones.set(value, clone);
		for (const [key, entryValue] of value) {
			clone.set(
				cloneRecursive(key, clones),
				cloneRecursive(entryValue, clones),
			);
		}
		return clone;
	}
	if (value instanceof Set) {
		const clone = new Set();
		clones.set(value, clone);
		for (const entryValue of value) {
			clone.add(cloneRecursive(entryValue, clones));
		}
		return clone;
	}
	if (ArrayBuffer.isView(value)) {
		const clone =
			value instanceof DataView
				? new DataView(
						value.buffer.slice(
							value.byteOffset,
							value.byteOffset + value.byteLength,
						),
					)
				: new value.constructor(value);
		clones.set(value, clone);
		return clone;
	}

	const clone = Array.isArray(value)
		? []
		: Object.create(Object.getPrototypeOf(value));
	clones.set(value, clone);
	for (const key of Object.keys(value)) {
		clone[key] = cloneRecursive(value[key], clones);
	}
	return clone;
};
