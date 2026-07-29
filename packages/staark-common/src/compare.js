/**
 * Recursively checks if two values are equal.
 *
 * @param {*} valueA The first value to compare.
 * @param {*} valueB The second value to compare.
 * @param {WeakMap<object, WeakSet<object>>} [compared] Compared object pairs.
 * @returns {boolean} Returns true if the values are equal, otherwise false.
 */
export const equalRecursive = (valueA, valueB, compared = new WeakMap()) => {
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
		if (!ArrayBuffer.isView(valueB) || valueA.length !== valueB.length)
			return false;
		for (let index = 0; index < valueA.length; index++) {
			if (valueA[index] !== valueB[index]) return false;
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
