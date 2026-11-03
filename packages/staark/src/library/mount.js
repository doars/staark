import {
	arrayify,
	arrayifyOrUndefined,
} from "@doars/staark-common/src/array.js";
import { attributeToString } from "@doars/staark-common/src/attribute.js";
import { clonePlain, equalPlain } from "@doars/staark-common/src/compare.js";
import { childrenToNodes } from "@doars/staark-common/src/element.js";
import { increasingSubsequence } from "@doars/staark-common/src/sequence.js";
import { isProxy, proxify, toTarget } from "./proxy.js";

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributeListener} NodeAttributeListener
 * @typedef {import('@doars/staark-common/src/memo.js').MemoAbstract} MemoAbstract
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 */

/**
 * @typedef {Object} MemoData
 * @property {NodeContent[]} c Remembered abstract tree after rendering.
 * @property {any} m Remembered data to compare with.
 */

/**
 * @param {HTMLElement | Element | string} rootElement Root element to mount the view on.
 * @param {function(Object<string, any>): (NodeContent[] | NodeContent)} renderView Function to render the view using the state.
 * @param {Object<string, any> | string} [initialState]  Initial state to use.
 * @param {NodeContent[] | string | null} [oldAbstractTree] Old abstract tree to compare with.
 * @returns {undefined | [function(string[]): void, function(): unknown, Object<string, any>]} Returns a trigger function to update the view, a function to unmount the view and the state object.
 */
export const mount = (
	rootElement,
	renderView,
	initialState,
	oldAbstractTree,
) => {
	const setBefore =
		"moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
	const getKey = (abstract) => abstract?.a?.key;

	let updatePromise = null;
	/**
	 * Triggers an update to the view by scheduling the updateAbstracts function if not already updating.
	 */
	const triggerUpdate = () => {
		if (!updatePromise) {
			updatePromise = Promise.resolve().then(updateAbstracts);
		}
		return updatePromise;
	};
	const state =
		typeof initialState === "string"
			? proxify(JSON.parse(initialState), triggerUpdate)
			: isProxy(initialState)
				? initialState
				: proxify(initialState || {}, triggerUpdate);

	// Listeners per element, all invoked through a single shared event handler.
	const listeners = new WeakMap();
	const handleEvent = (event) => {
		listeners.get(event.currentTarget)[event.type](event, state);
	};

	/**
	 * @param {Element} element Element to update.
	 * @param {NodeAttributes} newAttributes New attributes to set.
	 * @param {NodeAttributes} [oldAttributes] Old attributes to compare with.
	 */
	const updateAttributes = (element, newAttributes, oldAttributes) => {
		if (newAttributes) {
			for (const name in newAttributes) {
				if (name === "key" || !Object.hasOwn(newAttributes, name)) {
					continue;
				}
				let value = newAttributes[name];
				const oldValue = oldAttributes?.[name];
				if (value !== null && value !== undefined && value !== false) {
					const type = typeof value;
					if (type === "function") {
						if (value === oldValue) {
							continue;
						}
						let elementListeners = listeners.get(element);
						if (!elementListeners) {
							elementListeners = {};
							listeners.set(element, elementListeners);
						}
						if (!elementListeners[name]) {
							element.addEventListener(name, handleEvent);
						}
						elementListeners[name] = value;
					} else if (name === "style" && type === "object") {
						const oldStyle =
							oldValue && typeof oldValue === "object" ? oldValue : null;
						if (!oldStyle) {
							element.style.cssText = "";
						}
						for (const styleName in value) {
							const styleValue = value[styleName];
							if (
								Object.hasOwn(value, styleName) &&
								oldStyle?.[styleName] !== styleValue
							) {
								if (styleName.includes("-", 1)) {
									element.style.setProperty(styleName, styleValue);
								} else {
									element.style[styleName] = styleValue;
								}
							}
						}

						if (oldStyle) {
							for (const styleName in oldStyle) {
								if (
									Object.hasOwn(oldStyle, styleName) &&
									!Object.hasOwn(value, styleName)
								) {
									if (styleName.includes("-", 1)) {
										element.style.removeProperty(styleName);
									} else {
										element.style[styleName] = "";
									}
								}
							}
						}
					} else if (value !== oldValue || name === "value") {
						value = attributeToString(name, value);
						if (
							oldValue === null ||
							oldValue === undefined ||
							oldValue === false ||
							attributeToString(name, oldValue) !== value
						) {
							element.setAttribute(name, value);
						}
						if (name === "value" && element.value !== value) {
							element.value = value;
						}
					}
				}
			}
		}

		if (oldAttributes) {
			for (const name in oldAttributes) {
				if (name === "key" || !Object.hasOwn(oldAttributes, name)) {
					continue;
				}
				const newValue = newAttributes?.[name];
				if (newValue === null || newValue === undefined || newValue === false) {
					if (typeof oldAttributes[name] === "function") {
						element.removeEventListener(name, handleEvent);
						delete listeners.get(element)[name];
					} else {
						element.removeAttribute(name);
						if (name === "value") {
							element.value = "";
						}
					}
				}
			}
		}
	};

	let oldMemoMap = new WeakMap();
	let newMemoMap = new WeakMap();
	let updateChildren;

	/**
	 * Replace memo abstracts with their rendered contents. Unchanged memos reuse their previous contents, which lets the diff skip them.
	 *
	 * @param {NodeContent[]} [abstracts] Abstracts to expand.
	 * @returns {NodeContent[] | undefined} Abstracts without memos.
	 */
	const expand = (abstracts) => {
		let result = abstracts;
		if (abstracts) {
			for (let index = 0; index < abstracts.length; index++) {
				const abstract = abstracts[index];
				if (abstract.r) {
					if (result === abstracts) {
						result = abstracts.slice(0, index);
					}
					// Memos are cached per render function, and found by their memory first so reordered state objects are reused, then by their position.
					let memos = newMemoMap.get(abstract.r);
					if (!memos) {
						memos = { l: [], i: new Map() };
						newMemoMap.set(abstract.r, memos);
					}
					const oldMemos = oldMemoMap.get(abstract.r);
					// State objects are compared through their targets, which is faster than through the proxy.
					const memory = toTarget(abstract.m);
					let match = oldMemos?.i.get(memory) ?? oldMemos?.l[memos.l.length];
					if (!match || !equalPlain(match.m, memory)) {
						match = {
							c: expand(arrayify(abstract.r(state, abstract.m))),
							// Copied so memory mutated in place, such as the state, is still compared with its previous contents.
							m: clonePlain(memory),
						};
					}
					memos.l.push(match);
					memos.i.set(memory, match);
					result.push(...match.c);
				} else if (result !== abstracts) {
					result.push(abstract);
				}
			}
		}
		return result;
	};

	/**
	 * Create a DOM node from an abstract node.
	 *
	 * @param {NodeContent} abstract The abstract node to create.
	 * @param {boolean} inSvg Whether the node is inside an SVG element.
	 * @returns {Node} The created DOM node.
	 */
	const createNode = (abstract, inSvg) => {
		if (!abstract.t) {
			return document.createTextNode(abstract);
		}

		inSvg = inSvg || abstract.t === "SVG" || abstract.t === "svg";
		const element = inSvg
			? document.createElementNS("http://www.w3.org/2000/svg", abstract.t)
			: document.createElement(abstract.t);
		updateAttributes(element, abstract.a);
		abstract.c = expand(abstract.c);
		updateChildren(element, abstract.c, undefined, inSvg);
		return element;
	};

	/**
	 * Update a DOM node from an abstract node.
	 *
	 * @param {Node} node The DOM node to update.
	 * @param {NodeContent} newAbstract The new abstract node to apply.
	 * @param {NodeContent} oldAbstract The old abstract node to replace.
	 * @param {boolean} inSvg Whether the node is inside an SVG element.
	 */
	const updateNode = (node, newAbstract, oldAbstract, inSvg) => {
		if (newAbstract === oldAbstract) {
			return;
		}
		if (newAbstract.t) {
			updateAttributes(node, newAbstract.a, oldAbstract.a);
			newAbstract.c = expand(newAbstract.c);
			updateChildren(
				node,
				newAbstract.c,
				oldAbstract.c,
				inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg",
			);
		} else {
			node.textContent = newAbstract;
		}
	};

	/**
	 * @param {Element} element Element to update.
	 * @param {NodeContent[]} [newChildAbstracts] New children to set.
	 * @param {NodeContent[]} [oldChildAbstracts] Old children to compare with.
	 * @param {boolean} [inSvg] Whether the element is inside an SVG element.
	 */
	updateChildren = (
		element,
		newChildAbstracts = [],
		oldChildAbstracts = [],
		inSvg,
	) => {
		const newLength = newChildAbstracts.length;
		const oldLength = oldChildAbstracts.length;

		// Update the shared prefix in place.
		let start = 0;
		let node = element.firstChild;
		for (; start < newLength && start < oldLength; start++) {
			const newAbstract = newChildAbstracts[start];
			const oldAbstract = oldChildAbstracts[start];
			if (
				newAbstract.t !== oldAbstract.t ||
				getKey(newAbstract) !== getKey(oldAbstract)
			) {
				break;
			}
			updateNode(node, newAbstract, oldAbstract, inSvg);
			node = node.nextSibling;
		}

		// Update the shared suffix of keyed children in place.
		let newEnd = newLength;
		let oldEnd = oldLength;
		let end = null;
		if (start < oldLength && start < newLength) {
			let tail = element.lastChild;
			while (start < newEnd && start < oldEnd) {
				const newAbstract = newChildAbstracts[newEnd - 1];
				const oldAbstract = oldChildAbstracts[oldEnd - 1];
				const key = getKey(oldAbstract);
				if (
					key == null ||
					newAbstract.t !== oldAbstract.t ||
					getKey(newAbstract) !== key
				) {
					break;
				}
				updateNode(tail, newAbstract, oldAbstract, inSvg);
				end = tail;
				tail = tail.previousSibling;
				newEnd--;
				oldEnd--;
			}
		}

		if (start === oldEnd) {
			// Nothing left to match, so insert the remaining children.
			for (; start < newEnd; start++) {
				element.insertBefore(createNode(newChildAbstracts[start], inSvg), end);
			}
			return;
		}
		if (start === newEnd) {
			// Nothing left to create, so remove the remaining children.
			for (; start < oldEnd; start++) {
				const next = node.nextSibling;
				node.remove();
				node = next;
			}
			return;
		}

		// Index the remaining old children by key, or by type when unkeyed.
		const oldNodes = [];
		for (let index = start; index < oldEnd; index++) {
			oldNodes[index] = node;
			node = node?.nextSibling;
		}
		const keyedIndexes = new Map();
		const unkeyedIndexes = new Map();
		for (let index = oldEnd; index-- > start; ) {
			const abstract = oldChildAbstracts[index];
			const key = getKey(abstract);
			if (key != null) {
				keyedIndexes.set(key, index);
			} else {
				let indexes = unkeyedIndexes.get(abstract.t);
				if (!indexes) {
					indexes = [];
					unkeyedIndexes.set(abstract.t, indexes);
				}
				// Stored in reverse so pop returns the first remaining match.
				indexes.push(index);
			}
		}

		// Match the remaining new children to old ones.
		const newNodes = [];
		const sources = [];
		for (let index = start; index < newEnd; index++) {
			const newAbstract = newChildAbstracts[index];
			const key = getKey(newAbstract);
			const oldIndex =
				key != null
					? keyedIndexes.get(key)
					: unkeyedIndexes.get(newAbstract.t)?.pop();
			const oldNode = oldNodes[oldIndex];
			if (oldNode && oldChildAbstracts[oldIndex].t === newAbstract.t) {
				oldNodes[oldIndex] = null;
				newNodes[index] = oldNode;
				sources[index] = oldIndex;
				updateNode(oldNode, newAbstract, oldChildAbstracts[oldIndex], inSvg);
			}
		}

		for (let index = start; index < oldEnd; index++) {
			oldNodes[index]?.remove();
		}

		// Place children from back to front, only moving those outside the longest stable run.
		const stable = increasingSubsequence(sources);
		let next = end;
		for (let index = newEnd; index-- > start; ) {
			let child = newNodes[index];
			if (!child) {
				child = createNode(newChildAbstracts[index], inSvg);
				element.insertBefore(child, next);
			} else if (!stable[index]) {
				element[setBefore](child, next);
			}
			next = child;
		}
	};

	rootElement =
		typeof rootElement === "string"
			? document.querySelector(rootElement) ||
				document.body.appendChild(document.createElement("div"))
			: rootElement;

	if (typeof oldAbstractTree === "string") {
		try {
			oldAbstractTree = JSON.parse(oldAbstractTree);
		} catch {
			oldAbstractTree = null;
		}
	}
	if (!oldAbstractTree) {
		oldAbstractTree = childrenToNodes(rootElement);
	}

	let active = true,
		updating = false;
	/**
	 * Updates the abstract tree representation of the view and applies changes to the DOM.
	 */
	const updateAbstracts = () => {
		if (active && !updating && updatePromise) {
			updating = true;
			updatePromise = null;
			try {
				const newAbstractTree = expand(arrayifyOrUndefined(renderView(state)));
				updateChildren(rootElement, newAbstractTree, oldAbstractTree);
				oldAbstractTree = newAbstractTree;
				oldMemoMap = newMemoMap;
				newMemoMap = new WeakMap();
			} finally {
				updating = false;
			}
		}
	};
	triggerUpdate();
	updateAbstracts();

	return [
		triggerUpdate,
		() => {
			if (active) {
				active = false;
				updatePromise = null;

				for (let i = rootElement.childNodes.length - 1; i >= 0; i--) {
					rootElement.childNodes[i].remove();
				}
			}
		},
		state,
	];
};
