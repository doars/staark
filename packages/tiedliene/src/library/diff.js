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

const valuesEqual = (before, after, compared = new WeakMap()) => {
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
	let comparedAfter = compared.get(before);
	if (comparedAfter?.has(after)) {
		return true;
	}
	if (!comparedAfter) {
		comparedAfter = new WeakSet();
		compared.set(before, comparedAfter);
	}
	comparedAfter.add(after);
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
			let matchIndex = -1;
			for (let index = 0; index < unmatchedEntries.length; index++) {
				const [afterKey, afterValue] = unmatchedEntries[index];
				if (
					valuesEqual(beforeKey, afterKey, new WeakMap()) &&
					valuesEqual(beforeValue, afterValue, new WeakMap())
				) {
					matchIndex = index;
					break;
				}
			}
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
				valuesEqual(beforeValue, afterValue, new WeakMap()),
			);
			if (matchIndex < 0) {
				return false;
			}
			unmatchedValues.splice(matchIndex, 1);
		}
		return true;
	}
	return false;
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
	for (const change of diff) {
		if (reverting) {
			if (change.type === "set") {
				if (change.old === undefined) {
					deleteValueAtPath(state, change.path);
				} else {
					setValueAtPath(state, change.path, change.old);
				}
			} else {
				setValueAtPath(state, change.path, change.old);
			}
		} else if (change.type === "set") {
			setValueAtPath(state, change.path, change.new);
		} else {
			deleteValueAtPath(state, change.path);
		}
	}
	return state;
};

/**
 * Determine the differences between two objects.
 *
 * @param {Record<string, any>} before The object before the change.
 * @param {Record<string, any>} after The object after the change.
 * @param {string[]} [path=[]] The path to the current object.
 * @param {WeakMap<object, WeakSet<object>>} [compared] Compared object pairs.
 * @returns {Change[]} The changes between the two objects.
 */
export const determineDiff = (
	before,
	after,
	path = [],
	compared = new WeakMap(),
) => {
	const changes = [];
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

	// Check for keys in the "before" object that are not in "after".
	for (const key of Object.keys(before)) {
		const currentPath = [...path, key];

		if (!Object.hasOwn(after, key)) {
			changes.unshift({
				type: "delete",
				path: currentPath,
				old: cloneRecursive(before[key]),
			});
		} else if (isContainer(before[key]) && isContainer(after[key])) {
			// If both are objects, recurse deeper.
			changes.unshift(
				...determineDiff(before[key], after[key], currentPath, compared),
			);
		} else if (!valuesEqual(before[key], after[key])) {
			// If the value has changed, record the new and old value.
			changes.unshift({
				type: "set",
				path: currentPath,
				old: cloneRecursive(before[key]),
				new: cloneRecursive(after[key]),
			});
		}
	}

	// Check for keys in the "after" object that were not in "before".
	for (const key of Object.keys(after)) {
		if (!Object.hasOwn(before, key)) {
			changes.unshift({
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
