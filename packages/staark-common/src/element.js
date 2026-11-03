import { node } from "./node.js";

/**
 * Sets a style property on an element. Hyphenated names, such as custom properties, are set with `setProperty`, other names as properties of the style declaration. An empty value removes the property.
 *
 * @param {ElementCSSInlineStyle} element Element to set the style on.
 * @param {string} name Name of the style property.
 * @param {string} value Value of the style property.
 */
export const setStyle = (element, name, value) => {
	if (name.includes("-", 1)) {
		element.style.setProperty(name, value);
	} else {
		element.style[name] = value;
	}
};

/**
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Object} Attribute An attribute of an element.
 * @property {string} name The name of the attribute.
 * @property {string} value The value of the attribute.
 */

/**
 * Converts child nodes of an element to an array of abstract nodes.
 * @param {Element | ChildNode} element The element to convert.
 * @returns {NodeContent[]} The abstract nodes that are equivalent to the given element's child nodes.
 */
export const childrenToNodes = (element) => {
	const abstractChildNodes = [];
	for (const childNode of element.childNodes) {
		if (childNode instanceof Text) {
			abstractChildNodes.push(childNode.textContent ?? "");
		} else {
			const attributes = {};
			// Comments and other non-element nodes have no attributes.
			for (const attribute of childNode.attributes ?? []) {
				attributes[attribute.name] = attribute.value;
			}

			abstractChildNodes.push(
				node(
					childNode.localName ?? childNode.nodeName,
					attributes,
					childrenToNodes(childNode),
				),
			);
		}
	}
	return abstractChildNodes;
};
