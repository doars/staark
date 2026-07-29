import { arrayifyOrUndefined } from "@doars/staark-common/src/array.js";

const SELF_CLOSING = new Set([
	"base",
	"br",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"source",
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

const MATCH_CAPITALS = /[A-Z]+(?![a-z])|[A-Z]/g;
/**
 * Converts a string part to hyphenated form based on offset.
 *
 * @param {string} part - The part to hyphenate.
 * @param {number} offset - The offset position.
 * @returns {string} The hyphenated part.
 */
const HYPHENATE = (part, offset) => (offset ? "-" : "") + part;

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
		if (value === null || value === undefined) {
			continue;
		}

		if (validatedName === "class" && typeof value === "object") {
			if (Array.isArray(value)) {
				value = value.join(" ");
			} else {
				const classNames = [];
				for (const className of Object.keys(value)) {
					if (value[className]) {
						classNames.push(className);
					}
				}
				value = classNames.join(" ");
			}
		} else if (validatedName === "style" && typeof value === "object") {
			if (Array.isArray(value)) {
				value = value.join(";");
			} else {
				const styles = [];
				for (let styleProperty of Object.keys(value)) {
					const styleValue = value[styleProperty];
					styleProperty = styleProperty
						.replace(MATCH_CAPITALS, HYPHENATE)
						.toLowerCase();

					styles.push(
						`${styleProperty}:${
							Array.isArray(styleValue) ? styleValue.join(" ") : styleValue
						}`,
					);
				}
				value = styles.join(";");
			}
		}

		rendered += ` ${validatedName}="${escapeAttribute(value)}"`;
	}

	return rendered;
};

/**
 * Render elements to string.
 *
 * @param {NodeContent[]} [abstracts] Abstract tree.
 * @returns {string} Rendered elements.
 */
const renderElements = (abstracts, state) => {
	let rendered = "";
	if (!abstracts) {
		return rendered;
	}

	for (const abstract of abstracts) {
		if (abstract === null || abstract === undefined || abstract === false) {
			continue;
		}

		if (abstract.m) {
			rendered += renderElements(
				arrayifyOrUndefined(abstract.r(state, abstract.m)),
				state,
			);
		} else if (abstract.t) {
			const type = validateName(abstract.t, "element").toLocaleLowerCase();
			rendered += `<${type}${renderAttributes(abstract.a)}`;
			if (SELF_CLOSING.has(type)) {
				rendered += "/>";
			} else {
				rendered += `>${renderElements(abstract.c, state)}</${type}>`;
			}
		} else {
			rendered += ` ${escapeText(abstract)} `;
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
	abstractTree = arrayifyOrUndefined(abstractTree);
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

	const abstractTree = arrayifyOrUndefined(renderView(initialState));
	return [renderElements(abstractTree, initialState), abstractTree];
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
		const keys = Object.keys(data).filter((key) => !key.startsWith("_"));
		const values = [];
		for (const key of keys) {
			values.push(`${JSON.stringify(key)}:${customStringify(data[key])}`);
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
