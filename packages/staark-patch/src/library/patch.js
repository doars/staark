import { arrayifyOrUndefined } from "@doars/staark-common/src/array.js";
import { childrenToNodes } from "@doars/staark-common/src/element.js";

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
		for (const name of Object.keys(newAttributes)) {
			if (name !== "key") {
				let value = newAttributes[name];
				const oldValue = oldAttributes?.[name];
				if (value !== null && value !== undefined && value !== false) {
					const type = typeof value;
					if (type === "function") {
						if (oldValue !== value) {
							if (oldValue) {
								element.removeEventListener(name, oldValue);
							}

							element.addEventListener(name, value);
						}
					} else {
						if (name === "class") {
							if (typeof value === "object") {
								if (Array.isArray(value)) {
									value = value.join(" ");
								} else {
									let classNames = "";
									for (const className of Object.keys(value)) {
										if (value[className]) {
											classNames += ` ${className}`;
										}
									}
									value = classNames;
								}
							}
							element.className = value;
						} else if (name === "style" && typeof value === "object") {
							// Apply updated styles.
							for (const styleName of Object.keys(value)) {
								const styleValue = value[styleName];
								if (styleName.includes("-", 1)) {
									element.style.setProperty(styleName, styleValue);
								} else {
									element.style[styleName] = styleValue;
								}
							}

							// Remove old styles.
							if (
								oldValue &&
								typeof oldValue === "object" &&
								!Array.isArray(oldValue)
							) {
								for (const styleName of Object.keys(oldValue)) {
									if (!Object.hasOwn(value, styleName)) {
										if (styleName.includes("-", 1)) {
											element.style.removeProperty(styleName);
										} else {
											element.style[styleName] = null;
										}
									}
								}
							}
						} else {
							// Ensure it is of type string.
							if (type !== "string") {
								value = value.toString();
							}
							element.setAttribute(name, value);
							if (name === "value") {
								element.value = value;
							}
						}
					}
				}
			}
		}
	}

	// Cleanup old attributes.
	if (oldAttributes) {
		for (const name of Object.keys(oldAttributes)) {
			if (name !== "key") {
				const value = oldAttributes[name];
				const newValue = newAttributes?.[name];
				if (
					!Object.hasOwn(newAttributes || {}, name) ||
					newValue === null ||
					newValue === undefined ||
					newValue === false
				) {
					if (typeof value === "function") {
						element.removeEventListener(name, value);
					} else if (name === "class") {
						element.className = "";
					} else if (name === "style") {
						element.style.cssText = "";
					} else if (name === "value") {
						element.value = "";
						// Don't dispatch the input change event, the rerendering should update everything: element.dispatchEvent(new Event('change'))
					} else {
						element.removeAttribute(name);
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

		inSvg = inSvg || abstract.t === "SVG" || abstract.t === "svg";
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
		if (newAbstract.t) {
			updateAttributes(node, newAbstract.a, oldAbstract.a);
			updateChildren(
				node,
				newAbstract.c,
				oldAbstract.c,
				inSvg || newAbstract.t === "SVG" || newAbstract.t === "svg",
			);
		} else if (oldAbstract !== newAbstract) {
			node.textContent = newAbstract;
		}
	};

	/**
	 * Update the children of an element.
	 *
	 * @param {Element} element The element to update.
	 * @param {NodeContent[]} [newChildAbstracts] The new children to apply.
	 * @param {NodeContent[]} [oldChildAbstracts] The old children to cleanup.
	 */
	updateChildren = (element, newChildAbstracts, oldChildAbstracts, inSvg) => {
		let hasKeys = false;
		if (newChildAbstracts) {
			for (let index = 0; index < newChildAbstracts.length; index++) {
				const key = getKey(newChildAbstracts[index]);
				if (key != null) {
					hasKeys = true;
					break;
				}
			}
		}
		if (!hasKeys && oldChildAbstracts) {
			for (let index = 0; index < oldChildAbstracts.length; index++) {
				const key = getKey(oldChildAbstracts[index]);
				if (key != null) {
					hasKeys = true;
					break;
				}
			}
		}

		if (hasKeys) {
			const oldNodes = [];
			const keyedEntries = new Map();
			const unkeyedEntries = new Map();
			if (oldChildAbstracts) {
				for (let index = 0; index < oldChildAbstracts.length; index++) {
					const abstract = oldChildAbstracts[index];
					oldNodes.push(element.childNodes[index]);

					const key = getKey(abstract);
					if (key != null) {
						keyedEntries.set(key, index);
					} else {
						const type = abstract.t || null;
						let entries = unkeyedEntries.get(type);
						if (!entries) {
							entries = {
								indexes: [],
								index: 0,
							};
							unkeyedEntries.set(type, entries);
						}
						entries.indexes.push(index);
					}
				}
			}

			if (newChildAbstracts) {
				for (
					let newIndex = 0;
					newIndex < newChildAbstracts.length;
					newIndex++
				) {
					const newAbstract = newChildAbstracts[newIndex];
					const key = getKey(newAbstract);
					let oldIndex;
					if (key != null) {
						oldIndex = keyedEntries.get(key);
					} else {
						const type = newAbstract.t || null;
						const entries = unkeyedEntries.get(type);
						if (entries) {
							oldIndex = entries.indexes[entries.index++];
						}
					}
					const oldAbstract = oldChildAbstracts?.[oldIndex];
					const oldNode = oldNodes[oldIndex];

					if (
						oldIndex !== undefined &&
						oldNode &&
						((oldAbstract.t && newAbstract.t === oldAbstract.t) ||
							(!oldAbstract.t && !newAbstract.t))
					) {
						oldNodes[oldIndex] = undefined;
						if (oldNode !== element.childNodes[newIndex]) {
							element[setBefore](oldNode, element.childNodes[newIndex]);
						}

						updateNode(oldNode, newAbstract, oldAbstract, inSvg);
						continue;
					}

					const newNode = createNode(newAbstract, inSvg);
					element.insertBefore(newNode, element.childNodes[newIndex]);
				}
			}

			for (let index = 0; index < oldNodes.length; index++) {
				const oldNode = oldNodes[index];
				if (oldNode?.parentNode === element) {
					oldNode.remove();
				}
			}
		} else {
			let newIndex = 0;
			let newCount = 0;
			if (newChildAbstracts) {
				for (; newIndex < newChildAbstracts.length; newIndex++) {
					const newAbstract = newChildAbstracts[newIndex];

					// Try to find the matching old abstract.
					let matched = false;
					if (oldChildAbstracts) {
						for (
							let oldIndex = newIndex - newCount;
							oldIndex < oldChildAbstracts.length;
							oldIndex++
						) {
							const oldAbstract = oldChildAbstracts[oldIndex];
							if (
								(oldAbstract.t && newAbstract.t === oldAbstract.t) ||
								(!oldAbstract.t && !newAbstract.t)
							) {
								matched = true;

								if (newIndex !== oldIndex + newCount) {
									// Move node in dom.
									element[setBefore](
										element.childNodes[oldIndex + newCount],
										element.childNodes[newIndex],
									);
									// Move node in abstract tree. TODO: Remove this pesky splicing so the old abstract tree is not mutated.
									oldChildAbstracts.splice(
										newIndex - newCount,
										0,
										oldChildAbstracts.splice(oldIndex, 1)[0],
									);
								}

								updateNode(
									element.childNodes[newIndex],
									newAbstract,
									oldAbstract,
									inSvg,
								);
								break;
							}
						}
					}

					if (!matched) {
						const newNode = createNode(newAbstract, inSvg);
						element.insertBefore(newNode, element.childNodes[newIndex]);
						newCount++;
					}
				}
			}

			// Remove old elements.
			if (oldChildAbstracts) {
				for (
					let i = oldChildAbstracts.length + newCount - 1;
					i >= newIndex;
					i--
				) {
					element.childNodes[i].remove();
				}
			}
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
