/**
 * Recursively checks if two values are equal.
 *
 * @param {*} valueA The first value to compare.
 * @param {*} valueB The second value to compare.
 * @param {WeakMap<object, WeakSet<object>>} [compared] Compared object pairs.
 * @returns {boolean} Returns true if the values are equal, otherwise false.
 */
export const equalRecursive = (valueA, valueB, compared) => {
	if (valueA === valueB) {
		return true;
	}

	if (
		!valueA ||
		!valueB ||
		typeof valueA !== "object" ||
		typeof valueB !== "object"
	) {
		return valueA === valueB;
	}

	if (valueA instanceof Date) {
		return valueB instanceof Date && valueA.getTime() === valueB.getTime();
	}
	if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
		return false;
	}

	compared ??= new WeakMap();
	let comparedWithA = compared.get(valueA);
	if (comparedWithA?.has(valueB)) {
		return true;
	}
	if (!comparedWithA) {
		comparedWithA = new WeakSet();
		compared.set(valueA, comparedWithA);
	}
	comparedWithA.add(valueB);

	if (valueA instanceof Map) {
		if (!(valueB instanceof Map) || valueA.size !== valueB.size) return false;
		for (const [key, entryValue] of valueA) {
			if (
				!valueB.has(key) ||
				!equalRecursive(entryValue, valueB.get(key), compared)
			) {
				return false;
			}
		}
		return true;
	}
	if (valueA instanceof Set) {
		if (!(valueB instanceof Set) || valueA.size !== valueB.size) return false;
		for (const entryValue of valueA) {
			if (!valueB.has(entryValue)) return false;
		}
		return true;
	}
	if (ArrayBuffer.isView(valueA)) {
		if (
			!ArrayBuffer.isView(valueB) ||
			valueA.constructor !== valueB.constructor ||
			valueA.byteLength !== valueB.byteLength
		)
			return false;
		const bytesA = new Uint8Array(
			valueA.buffer,
			valueA.byteOffset,
			valueA.byteLength,
		);
		const bytesB = new Uint8Array(
			valueB.buffer,
			valueB.byteOffset,
			valueB.byteLength,
		);
		for (let index = 0; index < bytesA.length; index++) {
			if (bytesA[index] !== bytesB[index]) return false;
		}
		return true;
	}

	// if (valueA.prototype !== valueB.prototype) {
	//   return false
	// }

	const keys = Object.keys(valueA);
	return (
		keys.length === Object.keys(valueB).length &&
		keys.every(
			(key) =>
				Object.hasOwn(valueB, key) &&
				equalRecursive(valueA[key], valueB[key], compared),
		)
	);
};

/**
 * Checks if two children of a value compared by `equalPlain` are equal, given that they are not identical.
 *
 * @param {*} childA Child of the first value.
 * @param {*} childB Child of the second value.
 * @param {object} parent The first value, added to the path while comparing its children.
 * @param {object[]} [path] Objects currently being compared.
 * @returns {boolean} Whether the children are equal.
 */
const equalChild = (childA, childB, parent, path) => {
	if (
		!childA ||
		!childB ||
		typeof childA !== "object" ||
		typeof childB !== "object"
	) {
		return false;
	}
	path ??= [];
	path.push(parent);
	const equal = equalPlain(childA, childB, path);
	path.pop();
	return equal;
};

/**
 * Recursively checks if two plain data values are equal. Arrays and plain objects are compared by content and dates by time, any other object only by identity. Circular structures are never considered equal.
 *
 * @param {*} valueA The first value to compare.
 * @param {*} valueB The second value to compare.
 * @param {object[]} [path] Objects currently being compared.
 * @returns {boolean} Returns true if the values are equal, otherwise false.
 */
export const equalPlain = (valueA, valueB, path) => {
	if (valueA === valueB) {
		return true;
	}
	if (
		!valueA ||
		!valueB ||
		typeof valueA !== "object" ||
		typeof valueB !== "object"
	) {
		return false;
	}
	if (valueA instanceof Date) {
		return valueB instanceof Date && valueA.getTime() === valueB.getTime();
	}

	const prototype = Object.getPrototypeOf(valueA);
	if (
		prototype !== Object.getPrototypeOf(valueB) ||
		(prototype !== Object.prototype &&
			prototype !== Array.prototype &&
			prototype !== null) ||
		path?.includes(valueA)
	) {
		return false;
	}

	if (prototype === Array.prototype) {
		if (valueA.length !== valueB.length) {
			return false;
		}
		for (let index = 0; index < valueA.length; index++) {
			const childA = valueA[index];
			const childB = valueB[index];
			if (childA !== childB && !equalChild(childA, childB, valueA, path)) {
				return false;
			}
		}
		return true;
	}

	let count = 0;
	for (const key in valueA) {
		if (Object.hasOwn(valueA, key)) {
			count++;
			const childA = valueA[key];
			const childB = valueB[key];
			if (
				(childB === undefined && !Object.hasOwn(valueB, key)) ||
				(childA !== childB && !equalChild(childA, childB, valueA, path))
			) {
				return false;
			}
		}
	}
	return count === Object.keys(valueB).length;
};

/**
 * Copies plain data so it can later be compared with `equalPlain`, even when the original is mutated in place. Arrays and plain objects are copied recursively, dates by time, and other objects are kept by reference. Circular references are kept by reference.
 *
 * @param {any} value Value to copy.
 * @param {any[]} [path] Objects being copied, used to detect cycles.
 * @returns {any} Copy of the value.
 */
export const clonePlain = (value, path) => {
	if (!value || typeof value !== "object") {
		return value;
	}
	if (value instanceof Date) {
		return new Date(value.getTime());
	}

	const prototype = Object.getPrototypeOf(value);
	path ??= [];
	if (
		(prototype !== Object.prototype &&
			prototype !== Array.prototype &&
			prototype !== null) ||
		path.includes(value)
	) {
		return value;
	}

	path.push(value);
	const copy = Array.isArray(value) ? [] : prototype ? {} : Object.create(null);
	for (const key of Object.keys(value)) {
		copy[key] = clonePlain(value[key], path);
	}
	path.pop();
	return copy;
};
