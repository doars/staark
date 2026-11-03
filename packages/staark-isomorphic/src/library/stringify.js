import { isAbsent } from "@doars/staark-common/src/absent.js";
import {
	arrayify,
	arrayifyOrUndefined,
} from "@doars/staark-common/src/array.js";
import {
	attributeToString,
	styleToString,
} from "@doars/staark-common/src/attribute.js";

// Elements that can not have contents, so they are rendered without a closing tag.
const SELF_CLOSING = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

const UNSAFE_NAME_CHARACTERS = /[\s"'<>/=]/;
const TEXT_CHARACTERS = /[&<>]/g;
const ATTRIBUTE_CHARACTERS = /[&<>"']/g;
const ESCAPED_CHARACTERS = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/**
 * @typedef {import('@doars/staark-common/src/node.js').NodeContent} NodeContent
 * @typedef {import('@doars/staark-common/src/node.js').NodeAttributes} NodeAttributes
 * @typedef {import('@doars/staark-common/src/node.js').NodeAbstract} NodeAbstract
 * @typedef {import('@doars/staark-common/src/memo.js').MemoAbstract} MemoAbstract
 */

/**
 * @callback ViewFunction Render view function.
 * @param {Record<string, any>} state Current state.
 * @returns {NodeContent[] | NodeContent} Abstract tree.
 */

/**
 * Escape a character for use in HTML.
 *
 * @param {string} character - Character to escape.
 * @returns {string} Escaped character.
 */
const escapeCharacter = (character) => ESCAPED_CHARACTERS[character];

/**
 * Escape text content for use in HTML.
 *
 * @param {unknown} value - Text value to escape.
 * @returns {string} Escaped text.
 */
const escapeText = (value) =>
	String(value).replace(TEXT_CHARACTERS, escapeCharacter);

/**
 * Escape an attribute value for use in HTML.
 *
 * @param {unknown} value - Attribute value to escape.
 * @returns {string} Escaped attribute value.
 */
const escapeAttribute = (value) =>
	String(value).replace(ATTRIBUTE_CHARACTERS, escapeCharacter);

/**
 * Validate an HTML, SVG, custom element, or namespaced name.
 *
 * @param {unknown} name - Name to validate.
 * @param {string} context - Name context for the error.
 * @returns {string} Validated name.
 * @throws {TypeError} When the name is empty or contains unsafe characters.
 */
const validateName = (name, context) => {
	if (
		typeof name !== "string" ||
		name.length === 0 ||
		UNSAFE_NAME_CHARACTERS.test(name)
	) {
		throw new TypeError(`Invalid ${context} name: ${String(name)}`);
	}

	return name;
};

/**
 * Render attributes to string.
 *
 * @param {NodeAttributes} [attributes] Attributes to render.
 * @returns {string} Rendered attributes.
 */
const renderAttributes = (attributes) => {
	let rendered = "";
	if (!attributes) {
		return rendered;
	}

	for (const name of Object.keys(attributes)) {
		const validatedName = validateName(name, "attribute");
		let value = attributes[name];
		// Skip the same values the DOM renderers do not write: removed attributes, keys, and listeners.
		if (
			isAbsent(value) ||
			validatedName === "key" ||
			typeof value === "function"
		) {
			continue;
		}

		value =
			validatedName === "style" &&
			typeof value === "object" &&
			!Array.isArray(value)
				? styleToString(value)
				: attributeToString(validatedName, value);
		rendered += ` ${validatedName}="${escapeAttribute(value)}"`;
	}

	return rendered;
};

/**
 * Expand memos into their contents and normalize text, so the tree matches the DOM the browser parses from the rendered string. Adjacent text is merged into one text node and empty text is left out, as the browser would. Missing contents such as `null` and `false` are left out as well.
 *
 * @param {NodeContent[]} [abstracts] Abstract tree.
 * @param {Record<string, any>} [state] Current state.
 * @returns {NodeContent[] | undefined} Expanded abstract tree.
 */
const expand = (abstracts, state) => {
	if (!abstracts) {
		return abstracts;
	}

	const expanded = [];
	const add = (abstract) => {
		if (isAbsent(abstract)) {
			return;
		}
		if (abstract.r) {
			for (const child of arrayify(abstract.r(state, abstract.m))) {
				add(child);
			}
		} else if (abstract.t) {
			expanded.push({
				...abstract,
				c: expand(abstract.c, state),
			});
		} else if (abstract !== "") {
			const last = expanded.length - 1;
			if (last >= 0 && !expanded[last].t) {
				expanded[last] += `${abstract}`;
			} else {
				expanded.push(`${abstract}`);
			}
		}
	};
	for (const abstract of abstracts) {
		add(abstract);
	}
	return expanded;
};

/**
 * Render an expanded abstract tree to a string.
 *
 * @param {NodeContent[]} [abstracts] Expanded abstract tree.
 * @returns {string} Rendered elements.
 */
const renderElements = (abstracts) => {
	let rendered = "";
	if (!abstracts) {
		return rendered;
	}

	for (const abstract of abstracts) {
		if (abstract.t) {
			const type = validateName(abstract.t, "element").toLowerCase();
			rendered += `<${type}${renderAttributes(abstract.a)}`;
			if (SELF_CLOSING.has(type)) {
				rendered += "/>";
			} else {
				rendered += `>${renderElements(abstract.c)}</${type}>`;
			}
		} else {
			rendered += escapeText(abstract);
		}
	}

	return rendered;
};

/**
 * Stringify abstract tree.
 *
 * @param {NodeContent[] | NodeContent} [abstractTree] Abstract tree.
 * @returns {[string, NodeContent[] | undefined]} Rendered elements and abstract tree.
 */
export const stringifyPatch = (abstractTree) => {
	abstractTree = expand(arrayifyOrUndefined(abstractTree));
	return [renderElements(abstractTree), abstractTree];
};

/**
 * Stringify view.
 *
 * @param {ViewFunction} renderView Render view function.
 * @param {Record<string, any>} [initialState] Initial state.
 * @returns {[string, NodeContent[] | undefined]} Rendered elements and abstract tree.
 */
export const stringify = (renderView, initialState) => {
	if (!initialState) {
		initialState = {};
	}

	const abstractTree = expand(
		arrayifyOrUndefined(renderView(initialState)),
		initialState,
	);
	return [renderElements(abstractTree), abstractTree];
};

/**
 * Custom stringify function.
 *
 * @param {Record<string, any>} [data] Data to stringify.
 * @returns {string} Stringified data.
 */
const customStringify = (data) => {
	if (data === null) {
		return "null";
	}

	if (typeof data === "number" || typeof data === "boolean") {
		return String(data);
	}

	if (typeof data === "string") {
		return JSON.stringify(data);
	}

	if (Array.isArray(data)) {
		const values = [];
		for (const value of data) {
			values.push(customStringify(value));
		}
		return `[${values.join(",")}]`;
	}

	if (typeof data === "object") {
		const values = [];
		for (const key of Object.keys(data)) {
			// Like JSON, leave out undefined values and functions such as listeners.
			if (
				!key.startsWith("_") &&
				data[key] !== undefined &&
				typeof data[key] !== "function"
			) {
				values.push(`${JSON.stringify(key)}:${customStringify(data[key])}`);
			}
		}
		return `{${values.join(",")}}`;
	}

	return "null";
};

/**
 * Stringify patch with abstract tree.
 *
 * @param {NodeContent[]} [abstracts] Abstract tree.
 * @returns {[string, string]} Rendered elements.
 */
export const stringifyPatchFull = (abstracts) => {
	const [rendered, abstractTree] = stringifyPatch(abstracts);

	return [rendered, customStringify(abstractTree)];
};

/**
 * Stringify view with abstract tree.
 *
 * @param {ViewFunction} renderView Render view function.
 * @param {Record<string, any>} [initialState] Initial state.
 * @returns {[string, string, string]} Rendered elements, abstract tree and initial state.
 */
export const stringifyFull = (renderView, initialState) => {
	if (!initialState) {
		initialState = {};
	}

	const [rendered, abstractTree] = stringify(renderView, initialState);

	return [
		rendered,
		customStringify(abstractTree),
		JSON.stringify(initialState),
	];
};
