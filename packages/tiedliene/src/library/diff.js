import { cloneRecursive } from "../utilities/clone.js";

const FORBIDDEN_PATH_COMPONENTS = new Set([
	"__proto__",
	"constructor",
	"prototype",
]);
const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

/**
 * Validate a diff path before traversal.
 *
 * @param {unknown} path Path to validate.
 * @returns {Array<string | number>} Validated path.
 * @throws {TypeError} When the path is malformed or unsafe.
 */
const validatePath = (path) => {
	if (!Array.isArray(path) || path.length === 0) {
		throw new TypeError("Diff paths must be non-empty arrays");
	}

	for (const component of path) {
		if (
			typeof component !== "string" &&
			(!Number.isInteger(component) || component < 0)
		) {
			throw new TypeError(
				"Diff path components must be strings or array indices",
			);
		}
		if (FORBIDDEN_PATH_COMPONENTS.has(String(component))) {
			throw new TypeError(`Unsafe diff path component: ${String(component)}`);
		}
	}

	return path;
};

/**
 * Validate a complete diff before it is applied.
 *
 * @param {unknown} diff Diff to validate.
 * @returns {Change[]} Validated diff.
 * @throws {TypeError} When a change is malformed.
 */
const validateDiff = (diff) => {
	if (!Array.isArray(diff)) {
		throw new TypeError("Diff must be an array");
	}
	for (const change of diff) {
		if (
			!change ||
			typeof change !== "object" ||
			(change.type !== "set" && change.type !== "delete")
		) {
			throw new TypeError("Diff entries must be set or delete changes");
		}
		validatePath(change.path);
	}
	return diff;
};

/**
 * Check whether a value can be traversed as diff state.
 *
 * @param {unknown} value Value to check.
 * @returns {boolean} Whether the value is an object or array record.
 */
const isContainer = (value) =>
	value !== null &&
	typeof value === "object" &&
	(Array.isArray(value) ||
		Object.getPrototypeOf(value) === Object.prototype ||
		Object.getPrototypeOf(value) === null);

/**
 * Check whether two values are equal. Plain objects and arrays are compared by
 * their keys, Maps and Sets by their entries in any order.
 *
 * @param {unknown} before Value before the change.
 * @param {unknown} after Value after the change.
 * @param {Map<object, Set<object>>} [inProgress] Pairs still being compared.
 * @returns {boolean} Whether the values are equal.
 */
const valuesEqual = (before, after, inProgress) => {
	if (Object.is(before, after)) {
		return true;
	}
	if (
		!before ||
		!after ||
		typeof before !== "object" ||
		typeof after !== "object"
	) {
		return false;
	}
	if (before instanceof Date || after instanceof Date) {
		return (
			before instanceof Date &&
			after instanceof Date &&
			before.getTime() === after.getTime()
		);
	}
	if (ArrayBuffer.isView(before) || ArrayBuffer.isView(after)) {
		if (
			!ArrayBuffer.isView(before) ||
			!ArrayBuffer.isView(after) ||
			before.constructor !== after.constructor ||
			before.byteLength !== after.byteLength
		) {
			return false;
		}
		const beforeBytes = new Uint8Array(
			before.buffer,
			before.byteOffset,
			before.byteLength,
		);
		const afterBytes = new Uint8Array(
			after.buffer,
			after.byteOffset,
			after.byteLength,
		);
		for (let index = 0; index < beforeBytes.length; index++) {
			if (beforeBytes[index] !== afterBytes[index]) {
				return false;
			}
		}
		return true;
	}

	// A pair that is met again while it is still being compared is a cycle.
	// It is treated as equal, since any other difference still makes the outer
	// comparison fail. Pairs are removed once done, so a failed candidate entry
	// of a Map or Set leaves no trace.
	inProgress ??= new Map();
	let afters = inProgress.get(before);
	if (afters?.has(after)) {
		return true;
	}
	if (!afters) {
		afters = new Set();
		inProgress.set(before, afters);
	}
	afters.add(after);
	try {
		if (before instanceof Map || after instanceof Map) {
			if (
				!(before instanceof Map) ||
				!(after instanceof Map) ||
				before.size !== after.size
			) {
				return false;
			}
			const unmatchedEntries = [...after];
			for (const [beforeKey, beforeValue] of before) {
				const matchIndex = unmatchedEntries.findIndex(
					([afterKey, afterValue]) =>
						valuesEqual(beforeKey, afterKey, inProgress) &&
						valuesEqual(beforeValue, afterValue, inProgress),
				);
				if (matchIndex < 0) {
					return false;
				}
				unmatchedEntries.splice(matchIndex, 1);
			}
			return true;
		}
		if (before instanceof Set || after instanceof Set) {
			if (
				!(before instanceof Set) ||
				!(after instanceof Set) ||
				before.size !== after.size
			) {
				return false;
			}
			const unmatchedValues = [...after];
			for (const beforeValue of before) {
				const matchIndex = unmatchedValues.findIndex((afterValue) =>
					valuesEqual(beforeValue, afterValue, inProgress),
				);
				if (matchIndex < 0) {
					return false;
				}
				unmatchedValues.splice(matchIndex, 1);
			}
			return true;
		}
		const keys = Object.keys(before);
		return (
			isContainer(before) &&
			isContainer(after) &&
			Array.isArray(before) === Array.isArray(after) &&
			keys.length === Object.keys(after).length &&
			keys.every(
				(key) =>
					Object.hasOwn(after, key) &&
					valuesEqual(before[key], after[key], inProgress),
			)
		);
	} finally {
		afters.delete(after);
	}
};

/**
 * Convert and validate a path component for its parent container.
 *
 * @param {Record<string, any> | any[]} current Current container.
 * @param {string | number} component Path component.
 * @returns {string | number} Validated key.
 */
const getKey = (current, component) => {
	if (Array.isArray(current)) {
		if (
			(typeof component === "number" && component >= 0) ||
			(typeof component === "string" && ARRAY_INDEX.test(component))
		) {
			return Number(component);
		}
		throw new TypeError(
			`Invalid array index in diff path: ${String(component)}`,
		);
	}
	return component;
};

/**
 * @typedef {Object} Change A change to a state object.
 * @property {'delete' | 'set'} type The type of change.
 * @property {string[]} path The path to the value that changed.
 * @property {*} [new] The new value.
 * @property {*} [old] The old value.
 */

/**
 * Function to set a value at a given path.
 *
 * @param {Record<string, any>} record The record to update.
 * @param {string[]} path The path to the value to update.
 * @param {*} value The new value.
 */
const setValueAtPath = (record, path, value) => {
	let current = record;
	for (let index = 0; index < path.length - 1; index++) {
		if (!isContainer(current)) {
			throw new TypeError("Cannot traverse a non-record diff path value");
		}
		const key = getKey(current, path[index]);
		if (!Object.hasOwn(current, key)) {
			const nextComponent = path[index + 1];
			current[key] =
				typeof nextComponent === "number" ? [] : Object.create(null);
		}
		if (!isContainer(current[key])) {
			throw new TypeError("Cannot traverse a non-record diff path value");
		}
		current = current[key];
	}
	if (!isContainer(current)) {
		throw new TypeError("Cannot set a value on a non-record diff path value");
	}
	current[getKey(current, path[path.length - 1])] = cloneRecursive(value);
};

/**
 * Function to delete a value at a given path.
 *
 * @param {Record<string, any>} record The record to update.
 * @param {string[]} path The path to the value to delete.
 */
const deleteValueAtPath = (record, path) => {
	let current = record;
	for (let index = 0; index < path.length - 1; index++) {
		if (!isContainer(current)) {
			throw new TypeError("Cannot traverse a non-record diff path value");
		}
		const key = getKey(current, path[index]);
		if (!Object.hasOwn(current, key)) {
			return;
		}
		current = current[key];
	}
	if (!isContainer(current)) {
		throw new TypeError(
			"Cannot delete a value on a non-record diff path value",
		);
	}
	const key = getKey(current, path[path.length - 1]);
	if (Array.isArray(current)) {
		current.splice(key, 1);
	} else {
		delete current[key];
	}
};

/**
 * Apply already validated changes.
 *
 * @param {Record<string, any>} state State to update.
 * @param {Change[]} diff Changes to apply.
 * @param {boolean} reverting Whether changes are being reverted.
 * @returns {Record<string, any>} Updated state.
 */
const applyValidatedDiff = (state, diff, reverting) => {
	// Revert from the last change to the first, so each change sees the state
	// it was applied to.
	for (let index = 0; index < diff.length; index++) {
		const change = diff[reverting ? diff.length - index - 1 : index];
		// A set without an old value created the key, so reverting deletes it.
		if (reverting ? Object.hasOwn(change, "old") : change.type === "set") {
			setValueAtPath(state, change.path, reverting ? change.old : change.new);
		} else {
			deleteValueAtPath(state, change.path);
		}
	}
	return state;
};

/**
 * Determine the differences between two objects. The changes are in the order
 * they are applied in: per container, the keys of the "before" object from the
 * last to the first, then the keys only in the "after" object from the first
 * to the last. Array items are therefore removed from the end and appended
 * without leaving holes.
 *
 * @param {Record<string, any>} before The object before the change.
 * @param {Record<string, any>} after The object after the change.
 * @param {Array<string | number>} [path=[]] The path to the current object.
 * @param {WeakMap<object, WeakSet<object>>} [compared] Compared object pairs.
 * @param {Change[]} [changes=[]] The list to add the changes to.
 * @returns {Change[]} The changes between the two objects.
 */
export const determineDiff = (
	before,
	after,
	path = [],
	compared = new WeakMap(),
	changes = [],
) => {
	if (
		before &&
		after &&
		typeof before === "object" &&
		typeof after === "object"
	) {
		let comparedAfter = compared.get(before);
		if (comparedAfter?.has(after)) {
			return changes;
		}
		if (!comparedAfter) {
			comparedAfter = new WeakSet();
			compared.set(before, comparedAfter);
		}
		comparedAfter.add(after);
	}

	// Arrays are walked by index, so holes are read as undefined and paths
	// contain numbers.
	const isArray = Array.isArray(before);
	if (isArray !== Array.isArray(after)) {
		throw new TypeError("Cannot diff an array against an object");
	}
	const keys = isArray ? [...before.keys()] : Object.keys(before);
	for (let index = keys.length; index-- > 0; ) {
		const key = keys[index];
		if (isArray ? key >= after.length : !Object.hasOwn(after, key)) {
			changes.push({
				type: "delete",
				path: [...path, key],
				old: cloneRecursive(before[key]),
			});
		} else if (
			isContainer(before[key]) &&
			isContainer(after[key]) &&
			Array.isArray(before[key]) === Array.isArray(after[key])
		) {
			// If both are objects or both are arrays, recurse deeper.
			determineDiff(before[key], after[key], [...path, key], compared, changes);
		} else if (!valuesEqual(before[key], after[key])) {
			// If the value has changed, record the new and old value.
			changes.push({
				type: "set",
				path: [...path, key],
				old: cloneRecursive(before[key]),
				new: cloneRecursive(after[key]),
			});
		}
	}

	// Add the keys in the "after" object that were not in "before".
	for (const key of isArray ? [...after.keys()] : Object.keys(after)) {
		if (isArray ? key >= before.length : !Object.hasOwn(before, key)) {
			changes.push({
				type: "set",
				path: [...path, key],
				new: cloneRecursive(after[key]),
			});
		}
	}

	return changes;
};

/**
 * Apply a diff to a state object.
 *
 * @param {Record<string, any>} state The state object to update.
 * @param {Change[]} diff The diff to apply.
 * @returns {Record<string, any>} The updated state object.
 */
export const applyDiff = (state, diff) => {
	validateDiff(diff);
	applyValidatedDiff(cloneRecursive(state), diff, false);
	return applyValidatedDiff(state, diff, false);
};

/**
 * Revert a diff on a state object.
 *
 * @param {Record<string, any>} state The state object to revert.
 * @param {Change[]} diff The diff to revert.
 * @returns {Record<string, any>} The updated state object.
 */
export const revertDiff = (state, diff) => {
	validateDiff(diff);
	applyValidatedDiff(cloneRecursive(state), diff, true);
	return applyValidatedDiff(state, diff, true);
};
