import { cloneRecursive } from "../utilities/clone.js";

const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

/**
 * Validate a diff path before traversal.
 *
 * @param {unknown} path Path to validate.
 * @returns {Array<string | number>} Validated path.
 * @throws {TypeError} When the path is malformed.
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
	// When only "after" is one of these, the checks below return false.
	if (before instanceof Date) {
		return after instanceof Date && before.getTime() === after.getTime();
	}
	if (ArrayBuffer.isView(before)) {
		if (
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
		// The entries of a Map are [key, value] arrays, which are compared as
		// containers below.
		if (before instanceof Map || before instanceof Set) {
			if (
				before.constructor !== after.constructor ||
				before.size !== after.size
			) {
				return false;
			}
			const unmatched = [...after];
			for (const beforeEntry of before) {
				const matchIndex = unmatched.findIndex((afterEntry) =>
					valuesEqual(beforeEntry, afterEntry, inProgress),
				);
				if (matchIndex < 0) {
					return false;
				}
				unmatched.splice(matchIndex, 1);
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
			typeof component === "number" ||
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
 * @param {boolean} [inserting] Whether to insert the value into an array,
 * which undoes deleting it.
 */
const setValueAtPath = (record, path, value, inserting) => {
	// Every later level is checked as a child before it is entered.
	if (!isContainer(record)) {
		throw new TypeError("Cannot traverse a non-record diff path value");
	}
	let current = record;
	for (let index = 0; index < path.length - 1; index++) {
		const key = getKey(current, path[index]);
		if (!Object.hasOwn(current, key)) {
			// Define the key, since assigning "__proto__" would change the prototype.
			Object.defineProperty(current, key, {
				configurable: true,
				enumerable: true,
				value: typeof path[index + 1] === "number" ? [] : Object.create(null),
				writable: true,
			});
		}
		if (!isContainer(current[key])) {
			throw new TypeError("Cannot traverse a non-record diff path value");
		}
		current = current[key];
	}
	const key = getKey(current, path[path.length - 1]);
	if (inserting && Array.isArray(current)) {
		current.splice(key, 0, cloneRecursive(value));
	} else {
		Object.defineProperty(current, key, {
			configurable: true,
			enumerable: true,
			value: cloneRecursive(value),
			writable: true,
		});
	}
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
export const applyValidatedDiff = (state, diff, reverting) => {
	// Revert from the last change to the first, so each change sees the state
	// it was applied to.
	for (let index = 0; index < diff.length; index++) {
		const change = diff[reverting ? diff.length - index - 1 : index];
		// A set without an old value created the key, so reverting deletes it.
		if (
			reverting
				? change.type === "delete" || Object.hasOwn(change, "old")
				: change.type === "set"
		) {
			setValueAtPath(
				state,
				change.path,
				reverting ? change.old : change.new,
				change.type === "delete",
			);
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
 * @param {Map<object, object>} [paired] The "after" object each "before" object
 * was first compared with.
 * @param {Change[]} [changes=[]] The list to add the changes to.
 * @returns {Change[]} The changes between the two objects.
 */
export const determineDiff = (
	before,
	after,
	path = [],
	paired = new Map(),
	changes = [],
) => {
	// A "before" object reached again is shared, or part of a cycle. The
	// changes made through the first path already update it. If this path
	// should end up different, it gets its own copy instead.
	const firstAfter = paired.get(before);
	if (firstAfter) {
		if (!valuesEqual(firstAfter, after)) {
			changes.push({
				type: "set",
				path,
				old: cloneRecursive(before),
				new: cloneRecursive(after),
			});
		}
		return changes;
	}
	paired.set(before, after);

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
			determineDiff(before[key], after[key], [...path, key], paired, changes);
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
