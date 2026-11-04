import { createRecord, validateKey } from "./record.js";

/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} TomlOptions Options for the TOML parser.
 * @property {string[]} [types] The types that should be parsed as TOML.
 */

/**
 * @typedef {string | number | boolean | Date | TomlObject | TomlValue[]} TomlValue The value of a TOML key.
 */

/**
 * @typedef {Object.<string, TomlValue>} TomlObject The parsed TOML object.
 */

/**
 * Parse a TOML value.
 *
 * @param {string} value The TOML value to parse.
 * @returns {TomlValue} The parsed TOML value.
 */
const parseTomlValue = (value) => {
	if (value.startsWith('"') && value.endsWith('"')) {
		return value.slice(1, -1);
	}
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1);
	}
	if (value === "true" || value === "false") {
		return value === "true";
	}
	if (!Number.isNaN(Number(value))) {
		return Number(value);
	}
	if (
		value.match(
			/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
		)
	) {
		return new Date(value);
	}
	return value;
};

/**
 * Parse the comma-separated values in a TOML array.
 *
 * @param {string} value Array contents without brackets.
 * @returns {TomlValue[]} Parsed values.
 */
const parseTomlArray = (value) => {
	const values = [];
	let currentValue = "";
	let quote = null;
	for (const character of value) {
		if ((character === '"' || character === "'") && !quote) {
			quote = character;
			currentValue += character;
		} else if (character === quote) {
			quote = null;
			currentValue += character;
		} else if (character === "," && !quote) {
			if (currentValue.trim()) {
				values.push(parseTomlValue(currentValue.trim()));
			}
			currentValue = "";
		} else {
			currentValue += character;
		}
	}
	if (currentValue.trim()) {
		values.push(parseTomlValue(currentValue.trim()));
	}
	return values;
};

/**
 * Parse an inline table.
 *
 * @param {string} tableString The inline table string.
 * @returns {TomlObject} The parsed inline table.
 */
const parseInlineTable = (tableString) => {
	const result = createRecord();
	let key = "";
	let value = "";
	let inQuotes = false;
	let quoteChar = "";
	let inValue = false;

	for (let i = 1; i < tableString.length - 1; i++) {
		const character = tableString[i];
		if (!inQuotes && (character === '"' || character === "'")) {
			inQuotes = true;
			quoteChar = character;
			if (inValue) value += character;
		} else if (inQuotes && character === quoteChar) {
			inQuotes = false;
			if (inValue) value += character;
		} else if (!inQuotes && character === "=") {
			inValue = true;
		} else if (!inQuotes && character === ",") {
			const trimmedKey = key.trim();
			validateKey(trimmedKey);
			result[trimmedKey] = parseTomlValue(value.trim());
			key = "";
			value = "";
			inValue = false;
		} else {
			if (inValue) {
				value += character;
			} else {
				key += character;
			}
		}
	}

	if (key) {
		const trimmedKey = key.trim();
		validateKey(trimmedKey);
		result[trimmedKey] = parseTomlValue(value.trim());
	}

	return result;
};

/**
 * TOML parser.
 *
 * @param {TomlOptions} [options={}] Options for the TOML parser.
 * @returns {ResponseParser} The TOML parser.
 */
export const tomlParser = (options = {}) => {
	return {
		types: options.types || ["toml", "application/toml"],

		/**
		 * Parse the response as a TOML object.
		 *
		 * @param {Response} response The response to parse.
		 * @param {RequestOptions} requestOptions The options for the request.
		 * @param {string} type The MIME type of the response.
		 * @returns {Promise<TomlObject>} The parsed TOML object.
		 */
		parser: async (response, _requestOptions, _type) => {
			const text = await response.text();

			const result = createRecord();
			let currentTable = result;
			let multilineArray = null;
			let multilineArrayKey = null;
			let multilineString = null;
			let multilineStringKey = null;
			let multilineStringDelimiter = null;

			const lines = text.split(/\r?\n/);
			for (let i = 0; i < lines.length; i++) {
				if (multilineString !== null) {
					const rawLine = lines[i].trimEnd();
					if (rawLine.endsWith(multilineStringDelimiter)) {
						multilineString += rawLine.slice(0, -3);
						// A backslash at the end of a line joins it with the next line.
						currentTable[multilineStringKey] =
							multilineStringDelimiter === '"""'
								? multilineString.replace(/\\\s*\n\s*/g, "")
								: multilineString;
						multilineString = null;
					} else {
						multilineString += `${rawLine}\n`;
					}
					continue;
				}

				// Remove a trailing comment that is outside of quotes.
				const line = lines[i]
					.trim()
					.replace(/^((?:"[^"]*"|'[^']*'|[^"'])*?)\s+#.*$/, "$1");

				if (line === "" || line.startsWith("#")) {
					continue; // Skip empty lines and comments
				}
				if (multilineArray !== null) {
					multilineArray += ` ${line}`;
					if (line.endsWith("]")) {
						currentTable[multilineArrayKey] = parseTomlArray(
							multilineArray.slice(0, -1),
						);
						multilineArray = null;
						multilineArrayKey = null;
					}
					continue;
				}

				if (line.startsWith("[[") && line.endsWith("]]")) {
					// Array of Tables
					const arrayName = line.slice(2, -2).trim();
					const parts = arrayName.split(".");
					let parent = result;
					for (let i = 0; i < parts.length - 1; i++) {
						validateKey(parts[i]);
						if (!Object.hasOwn(parent, parts[i]))
							parent[parts[i]] = createRecord();
						parent = parent[parts[i]];
					}
					const lastPart = parts[parts.length - 1];
					validateKey(lastPart);
					if (!Object.hasOwn(parent, lastPart)) parent[lastPart] = [];
					const newTable = createRecord();
					parent[lastPart].push(newTable);
					currentTable = newTable;
					multilineArray = null;
					multilineArrayKey = null;
				} else if (line.startsWith("[") && line.endsWith("]")) {
					// Table
					const tableName = line.slice(1, -1).trim();
					currentTable = result;
					const parts = tableName.split(".");
					for (const part of parts) {
						validateKey(part);
						if (!Object.hasOwn(currentTable, part))
							currentTable[part] = createRecord();
						currentTable = currentTable[part];
					}
					multilineArray = null;
					multilineArrayKey = null;
				} else {
					// Key-value pair
					const [key, ...valueParts] = line.split("=");
					const value = valueParts.join("=").trim();
					const trimmedKey = key.trim();
					validateKey(trimmedKey);
					if (!value) {
						throw new SyntaxError(`Unsupported TOML on line ${i + 1}`);
					}

					if (value.startsWith('"""') || value.startsWith("'''")) {
						// Multi-line string
						multilineStringDelimiter = value.slice(0, 3);
						multilineString = value.slice(3);
						if (value.length >= 6 && value.endsWith(multilineStringDelimiter)) {
							currentTable[trimmedKey] = multilineString.slice(0, -3);
							multilineString = null;
						} else {
							multilineStringKey = trimmedKey;
							// A newline directly after the opening delimiter is dropped.
							if (multilineString) {
								multilineString += "\n";
							}
						}
					} else if (value.startsWith("{") && value.endsWith("}")) {
						// Inline table
						currentTable[trimmedKey] = parseInlineTable(value);
					} else if (value.startsWith("[") && !value.endsWith("]")) {
						// Multi-line array
						multilineArray = value.slice(1).trim();
						multilineArrayKey = trimmedKey;
					} else {
						if (value.startsWith("[") && value.endsWith("]")) {
							currentTable[trimmedKey] = parseTomlArray(value.slice(1, -1));
						} else {
							currentTable[trimmedKey] = parseTomlValue(value);
						}
					}
				}
			}

			return result;
		},
	};
};
