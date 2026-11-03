import { isAbsent } from "@doars/staark-common/src/absent.js";
import { arrayifyOrUndefined } from "@doars/staark-common/src/array.js";
import {
	attributeToString,
	styleValueToString,
} from "@doars/staark-common/src/attribute.js";
import { childrenToNodes, setStyle } from "@doars/staark-common/src/element.js";
import { increasingSubsequence } from "@doars/staark-common/src/sequence.js";

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributeListener} NodeAttributeListener
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 */

/**
 * Update the attributes of an element.
 *
 * @param {Element} element The element to update.
 * @param {NodeAttributes} newAttributes The new attributes to apply.
 * @param {NodeAttributes} [oldAttributes] The old attributes to cleanup.
 */
const updateAttributes = (element, newAttributes, oldAttributes) => {
	if (newAttributes) {
		for (const name in newAttributes) {
			if (name !== "key" && Object.hasOwn(newAttributes, name)) {
				let value = newAttributes[name];
				const oldValue = oldAttributes?.[name];
				if (!isAbsent(value)) {
					const type = typeof value;
					if (type === "function") {
						if (oldValue !== value) {
							if (typeof oldValue === "function") {
								element.removeEventListener(name, oldValue);
							}

							element.addEventListener(name, value);
						}
					} else if (
						name === "style" &&
						type === "object" &&
						!Array.isArray(value)
					) {
						const oldStyle =
							oldValue &&
							typeof oldValue === "object" &&
							!Array.isArray(oldValue)
								? oldValue
								: null;
						if (!oldStyle) {
							element.style.cssText = "";
						}

						// Apply changed styles.
						for (const styleName in value) {
							const styleValue = value[styleName];
							if (
								Object.hasOwn(value, styleName) &&
								oldStyle?.[styleName] !== styleValue
							) {
								setStyle(element, styleName, styleValueToString(styleValue));
							}
						}

						// Remove old styles.
						if (oldStyle) {
							for (const styleName in oldStyle) {
								if (
									Object.hasOwn(oldStyle, styleName) &&
									!Object.hasOwn(value, styleName)
								) {
									setStyle(element, styleName, "");
								}
							}
						}
					} else if (value !== oldValue || name === "value") {
						value = attributeToString(name, value);
						if (
							isAbsent(oldValue) ||
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
	}

	// Cleanup old attributes.
	if (oldAttributes) {
		for (const name in oldAttributes) {
			if (name !== "key" && Object.hasOwn(oldAttributes, name)) {
				const value = oldAttributes[name];
				const newValue = newAttributes?.[name];
				if (isAbsent(newValue)) {
					if (typeof value === "function") {
						element.removeEventListener(name, value);
					} else {
						element.removeAttribute(name);
						if (name === "value") {
							element.value = "";
							// Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
						}
					}
				}
			}
		}
	}
};

/**
 * Create a patch function that can be used to update the root element.
 *
 * @param {HTMLElement | Element | string} rootElement The root element to update.
 * @param {NodeContent[] | string | null} [oldAbstractTree] The old abstract tree to update.
 * @returns {function(NodeContent[] | NodeContent): unknown} The patch function to call to apply a new abstract tree to the element.
 */
export const prepare = (rootElement, oldAbstractTree) => {
	const setBefore =
		"moveBefore" in Element.prototype ? "moveBefore" : "insertBefore";
	const getKey = (abstract) => abstract?.a?.key;
	let updateChildren;

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

		inSvg = inSvg || abstract.t === "svg";
		const element = inSvg
			? document.createElementNS("http://www.w3.org/2000/svg", abstract.t)
			: document.createElement(abstract.t);
		updateAttributes(element, abstract.a);
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
			updateChildren(
				node,
				newAbstract.c,
				oldAbstract.c,
				inSvg || newAbstract.t === "svg",
			);
		} else {
			node.textContent = newAbstract;
		}
	};

	/**
	 * Update the children of an element.
	 *
	 * @param {Element} element The element to update.
	 * @param {NodeContent[]} [newChildAbstracts] The new children to apply.
	 * @param {NodeContent[]} [oldChildAbstracts] The old children to cleanup.
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
		} catch (_error) {
			oldAbstractTree = null;
		}
	}
	if (!oldAbstractTree) {
		oldAbstractTree = childrenToNodes(rootElement);
	}

	return (newAbstractTree) => {
		newAbstractTree = arrayifyOrUndefined(newAbstractTree);
		updateChildren(rootElement, newAbstractTree, oldAbstractTree);
		oldAbstractTree = newAbstractTree;
	};
};
