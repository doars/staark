import { node } from "./node.js";
import { propertyNameToType } from "./selector.js";

/**
 * @typedef {import('./node.js').NodeAbstract} NodeAbstract
 * @typedef {import('./node.js').NodeAttributes} NodeAttributes
 * @typedef {import('./node.js').NodeContent} NodeContent
 */

/**
 * @typedef {Function} Factory Function that generates the a node with the given type.
 * @param {NodeAttributes | NodeContent[] | NodeContent} [attributesOrContents] Attributes of node or contents.
 * @param {NodeContent[] | NodeContent} [contents] Abstracts of children.
 * @returns {NodeAbstract} Node abstract representing the given data.
 */

/**
 * @typedef {Object} FactoryCache Factory cache
 */

export const factory = /*#__PURE__*/ new Proxy(
	{},
	{
		/**
		 * @param {FactoryCache} target Factory cache.
		 * @param {string} type Type of the nodes to generate.
		 * @returns {Factory} Function that generates the a node with the given type.
		 */
		get: (target, type) => {
			if (target[type]) {
				return target[type];
			}

			const typeConverted = propertyNameToType(type);

			/**
			 * Generates a node with the given type.
			 *
			 * @param {NodeAttributes | NodeContent[] | NodeContent} [attributesOrContents] Attributes or contents.
			 * @param {NodeContent[] | NodeContent} [contents] Contents.
			 * @returns {NodeAbstract} The node abstract.
			 */
			// biome-ignore lint/suspicious/noAssignInExpressions: assignment is intentional
			return (target[type] = (attributesOrContents, contents) =>
				node(typeConverted, attributesOrContents, contents));
		},
	},
);
