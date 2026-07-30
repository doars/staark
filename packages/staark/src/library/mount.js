import { arrayifyOrUndefined } from "@doars/staark-common/src/array.js";
import { cloneRecursive } from "@doars/staark-common/src/clone.js";
import { equalRecursive } from "@doars/staark-common/src/compare.js";
import { childrenToNodes } from "@doars/staark-common/src/element.js";
import { proxify } from "./proxy.js";

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

	if (typeof initialState === "string") {
		initialState = JSON.parse(initialState);
	}
	if (!initialState) {
		initialState = {};
	}
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
		Object.getPrototypeOf(initialState) === Proxy.prototype
			? initialState
			: proxify(initialState, triggerUpdate);

	/**
	 * @param {Element} element Element to update.
	 * @param {NodeAttributes} newAttributes New attributes to set.
	 * @param {NodeAttributes} [oldAttributes] Old attributes to compare with.
	 */
	const updateAttributes = (element, newAttributes, oldAttributes) => {
		if (newAttributes) {
			for (const name of Object.keys(newAttributes)) {
				if (name === "key") {
					continue;
				}
				let value = newAttributes[name];
				const oldValue = oldAttributes?.[name];
				if (value !== null && value !== undefined && value !== false) {
					const type = typeof value;
					if (type === "function") {
						if (oldValue?.f === value) {
							newAttributes[name] = oldValue;
						} else {
							if (oldValue) {
								element.removeEventListener(name, oldValue);
							}

							// biome-ignore lint/suspicious/noAssignInExpressions: assignment is intentional
							const listener = (newAttributes[name] = (event) => {
								value(event, state);
							});
							element.addEventListener(name, listener);
							listener.f = value;
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
							for (const styleName of Object.keys(value)) {
								const styleValue = value[styleName];
								if (styleName.includes("-", 1)) {
									element.style.setProperty(styleName, styleValue);
								} else {
									element.style[styleName] = styleValue;
								}
							}

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

		if (oldAttributes) {
			for (const name of Object.keys(oldAttributes)) {
				if (name === "key") {
					continue;
				}
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
					} else {
						element.removeAttribute(name);
					}
				}
			}
		}
	};

	let oldMemoMap = new WeakMap();
	let newMemoMap = new WeakMap();
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
	 * @param {Element} element Element to update.
	 * @param {NodeContent[]} [newChildAbstracts] New children to set.
	 * @param {NodeContent[]} [oldChildAbstracts] Old children to compare with.
	 */
	updateChildren = (element, newChildAbstracts, oldChildAbstracts, inSvg) => {
		if (newChildAbstracts) {
			for (let index = 0; index < newChildAbstracts.length; index++) {
				const abstract = newChildAbstracts[index];
				if (!abstract.r) {
					continue;
				}

				let match = oldMemoMap.get(abstract.r);
				if (!match || !equalRecursive(match.m, abstract.m)) {
					match = {
						c: arrayifyOrUndefined(abstract.r(state, abstract.m)),
						m: abstract.m,
					};
				}
				newMemoMap.set(abstract.r, match);
				newChildAbstracts.splice(index, 1, ...cloneRecursive(match.c));
				index--;
			}
		}

		let hasKeys = false;
		if (newChildAbstracts) {
			for (let index = 0; index < newChildAbstracts.length; index++) {
				if (getKey(newChildAbstracts[index]) != null) {
					hasKeys = true;
					break;
				}
			}
		}
		if (!hasKeys && oldChildAbstracts) {
			for (let index = 0; index < oldChildAbstracts.length; index++) {
				if (getKey(oldChildAbstracts[index]) != null) {
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
						const entries = unkeyedEntries.get(newAbstract.t || null);
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
			return;
		}

		let newIndex = 0;
		let newCount = 0;
		if (newChildAbstracts) {
			for (; newIndex < newChildAbstracts.length; newIndex++) {
				const newAbstract = newChildAbstracts[newIndex];

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
								element[setBefore](
									element.childNodes[oldIndex + newCount],
									element.childNodes[newIndex],
								);
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

		if (oldChildAbstracts) {
			for (
				let i = oldChildAbstracts.length + newCount - 1;
				i >= newIndex;
				i--
			) {
				element.childNodes[i].remove();
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
				const newAbstractTree = arrayifyOrUndefined(renderView(state));
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
