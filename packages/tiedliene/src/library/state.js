import { cloneRecursive } from "../utilities/clone.js";
import { applyDiff, determineDiff, revertDiff } from "./diff.js";

/**
 * @typedef {import('./diff.js').Change} Change
 */

/**
 * @typedef {Object} ManageOptions Options for managing state.
 * @property {number} [maximumHistory] The maximum number of changes to keep in the undo and redo stacks.
 * @property {'clone' | 'reference'} [snapshot='clone'] Whether returned snapshots are cloned or exposed by reference.
 * @property {Function} [clone=cloneRecursive] Clone function used for state snapshots and instrumentation.
 */

/**
 * Manages state and provides undo and redo functionality.
 *
 * @param {Record<string, any>} state The initial state.
 * @param {ManageOptions} [options] Options for managing state.
 */
export const manageState = (state, options) => {
	options = Object.assign(
		{
			clone: cloneRecursive,
			maximumHistory: 50,
			snapshot: "clone",
		},
		options,
	);
	if (!Number.isInteger(options.maximumHistory) || options.maximumHistory < 0) {
		throw new TypeError("maximumHistory must be a non-negative integer");
	}
	if (options.snapshot !== "clone" && options.snapshot !== "reference") {
		throw new TypeError("snapshot must be clone or reference");
	}
	if (typeof options.clone !== "function") {
		throw new TypeError("clone must be a function");
	}
	const validateState = (value, visited = new WeakSet()) => {
		if (typeof value === "function") {
			throw new TypeError("Unsupported state value: function");
		}
		if (!value || typeof value !== "object" || visited.has(value)) {
			return;
		}
		visited.add(value);
		if (
			value instanceof WeakMap ||
			value instanceof WeakSet ||
			(typeof Node !== "undefined" && value instanceof Node)
		) {
			throw new TypeError("Unsupported state value");
		}
		if (Object.getOwnPropertySymbols(value).length > 0) {
			throw new TypeError("Unsupported symbol-keyed state");
		}
		if (value instanceof Date || ArrayBuffer.isView(value)) {
			return;
		}
		if (value instanceof Map) {
			for (const [key, entryValue] of value) {
				validateState(key, visited);
				validateState(entryValue, visited);
			}
			return;
		}
		if (value instanceof Set) {
			for (const entryValue of value) {
				validateState(entryValue, visited);
			}
			return;
		}
		const prototype = Object.getPrototypeOf(value);
		if (
			!Array.isArray(value) &&
			prototype !== Object.prototype &&
			prototype !== null
		) {
			throw new TypeError("Unsupported custom state instance");
		}
		for (const key of Object.keys(value)) {
			if (key === "__proto__" || key === "constructor" || key === "prototype") {
				throw new TypeError(`Unsafe diff path component: ${key}`);
			}
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			if (descriptor?.get || descriptor?.set) {
				throw new TypeError("Unsupported enumerable state accessor");
			}
			validateState(value[key], visited);
		}
	};
	validateState(state);
	state = options.clone(state);
	const snapshot = () =>
		options.snapshot === "reference" ? state : options.clone(state);
	// Diffs in the history applied cleanly before. With cloned snapshots
	// nothing else can change the state, so they apply cleanly again.
	const trusted = options.snapshot === "clone";

	/** @type {Change[][]} */
	const undoStack = [];
	/** @type {Change[][]} */
	const redoStack = [];

	return {
		/**
		 * Returns the current state.
		 *
		 * @returns {Record<string, any>} The current state.
		 */
		get: snapshot,

		/**
		 * Sets the state and returns the new state.
		 *
		 * @param {Record<string, any>} newState The new state.
		 * @returns {Record<string, any>} The new state.
		 */
		set: (newState) => {
			validateState(newState);
			const diff = determineDiff(state, newState);
			if (diff.length > 0) {
				// Apply first, so a failure leaves the history untouched.
				state = applyDiff(state, diff);
				undoStack.push(diff);
				if (undoStack.length > options.maximumHistory) {
					undoStack.shift();
				}
				redoStack.length = 0;
			}
			return snapshot();
		},

		/**
		 * Undoes the last change and returns the new state.
		 *
		 * @returns {Record<string, any>} The new state.
		 */
		undo: () => {
			if (undoStack.length > 0) {
				state = revertDiff(state, undoStack.at(-1), trusted);
				redoStack.push(undoStack.pop());
			}
			return snapshot();
		},

		/**
		 * Redoes the last change and returns the new state.
		 *
		 * @returns {Record<string, any>} The new state.
		 */
		redo: () => {
			if (redoStack.length > 0) {
				state = applyDiff(state, redoStack.at(-1), trusted);
				undoStack.push(redoStack.pop());
			}
			return snapshot();
		},
	};
};
