import { createRecord, validateKey } from "./record.js";

/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} YamlOptions Options for the YAML parser.
 * @property {string[]} [types] Content types to parse as YAML.
 */

/**
 * @typedef {string | number | boolean | null | YamlObject | YamlValue[]} YamlValue YAML value.
 */

/**
 * @typedef {Object.<string, YamlValue>} YamlObject YAML object.
 */

/**
 * Parses a YAML value.
 *
 * @param {string} value Value to parse.
 * @param {Record<string, YamlValue>} anchors Anchors.
 * @returns {YamlValue} Parsed value.
 */
const parseValue = (value, anchors) => {
	if (value === "null" || value === "~") {
		return null;
	}
	if (value === "true") {
		return true;
	}
	if (value === "false") {
		return false;
	}
	if (value.startsWith('"') && value.endsWith('"')) {
		return value.slice(1, -1);
	}
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1);
	}
	if (value && !Number.isNaN(Number(value))) {
		return Number(value);
	}
	if (value.startsWith("[") && value.endsWith("]")) {
		value = value.slice(1, -1).trim();
		return value
			? value.split(",").map((item) => parseValue(item.trim(), anchors))
			: [];
	}
	if (value.startsWith("*")) {
		const anchorName = value.slice(1).trim();
		return anchors[anchorName];
	}
	if (value.includes("!!")) {
		const [tag, tagValue] = value.split(" ");
		switch (tag) {
			case "!!int":
				return parseInt(tagValue, 10);
			case "!!float":
				return parseFloat(tagValue);
			case "!!str":
				return tagValue;
			case "!!bool":
				return tagValue.toLowerCase() === "true";
			default:
				return tagValue;
		}
	}
	return value;
};

/**
 * YAML parser.
 *
 * @param {YamlOptions} [options={}] Options for the YAML parser.
 * @returns {ResponseParser} Response parser that parses YAML.
 */
export const yamlParser = (options = {}) => {
	return {
		types: options.types || ["yaml", "application/yaml", "text/yaml"],

		/**
		 * Parse the response as a YAML object.
		 *
		 * @param {Response} response The response to parse.
		 * @param {RequestOptions} requestOptions The request options.
		 * @param {string} type The MIME type of the response.
		 * @returns {Promise<YamlObject>} The parsed YAML object.
		 */
		parser: async (response, _requestOptions, _type) => {
			const lines = (await response.text()).replace(/\r?\n$/, "").split("\n");
			// Closes a trailing block scalar.
			lines.push("#");
			const result = createRecord();
			const anchors = createRecord();
			const stack = [{ indent: -1, object: result }];
			let block = null;

			for (let i = 0; i < lines.length; i++) {
				let line = lines[i].trimEnd();
				let indent = line.search(/\S/);

				if (block) {
					if (indent < 0 || indent > block.indent) {
						block.lines.push(line);
						continue;
					}
					// The first line with content sets the indent of the block.
					const blockIndent = Math.max(
						(block.lines.find((blockLine) => blockLine) || "").search(/\S/),
						0,
					);
					let text = block.lines
						.map((blockLine) => blockLine.slice(blockIndent))
						.join("\n");
					if (block.style[0] === ">") {
						// Fold line breaks into spaces, except those of blank lines.
						text = text.replace(/\n(\n*)(?=.)/g, (_, extra) => extra || " ");
					}
					// Keep every trailing line break with "+", none with "-", otherwise one.
					block.object[block.key] =
						block.style[1] === "+"
							? `${text}\n`
							: text.replace(/\n*$/, block.style[1] === "-" ? "" : "\n");
					block = null;
				}

				// Remove a trailing comment that is outside of quotes.
				line = line.replace(/^((?:"[^"]*"|'[^']*'|[^"'])*?)\s+#.*$/, "$1");
				if (indent < 0 || line[indent] === "#" || line === "---") {
					continue;
				}

				let text = line.slice(indent);
				let top = stack[stack.length - 1];
				if (text === "-" || text.startsWith("- ")) {
					// A list item closes deeper entries and earlier items of its list.
					while (top.indent > indent || (top.indent === indent && top.item)) {
						stack.pop();
						top = stack[stack.length - 1];
					}
					if (!Array.isArray(top.object)) {
						if (!top.owner) {
							throw new SyntaxError(`Unsupported YAML on line ${i + 1}`);
						}
						// The first item turns the empty value of the key into a list.
						top.object = top.owner[top.key] = [];
						if (top.anchor) {
							anchors[top.anchor] = top.object;
						}
					}
					const rest = text.slice(1).trim();
					if (rest && !/^[^"'[{]*?:( |$)/.test(rest)) {
						top.object.push(parseValue(rest, anchors));
						continue;
					}
					const item = createRecord();
					top.object.push(item);
					stack.push({ indent, item: true, object: item });
					if (!rest) {
						continue;
					}
					// Read the rest as a key in the item, at the column where it starts.
					indent = line.indexOf(rest, indent + 1);
					text = rest;
				}

				while (stack[stack.length - 1].indent >= indent) {
					stack.pop();
				}
				const object = stack[stack.length - 1].object;
				const colonIndex = text.indexOf(":");
				if (colonIndex < 1 || Array.isArray(object)) {
					throw new SyntaxError(`Unsupported YAML on line ${i + 1}`);
				}
				const key = validateKey(text.slice(0, colonIndex).trim());
				let value = text.slice(colonIndex + 1).trim();
				let anchorName;
				if (value.startsWith("&")) {
					anchorName = value.slice(1).split(" ")[0];
					value = value.slice(anchorName.length + 2).trim();
				}

				if (/^[|>][+-]?$/.test(value)) {
					block = { indent, key, lines: [], object, style: value };
				} else if (key === "<<") {
					// Merge the keys of the referenced records that are not set yet.
					for (const record of [].concat(parseValue(value, anchors))) {
						for (const recordKey in record) {
							if (!(recordKey in object)) {
								object[recordKey] = record[recordKey];
							}
						}
					}
				} else if (value) {
					object[key] = parseValue(value, anchors);
				} else {
					object[key] = createRecord();
					stack.push({
						anchor: anchorName,
						indent,
						key,
						object: object[key],
						owner: object,
					});
				}
				if (anchorName) {
					anchors[anchorName] = object[key];
				}
			}

			return result;
		},
	};
};
