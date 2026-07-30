const BRACKET_CLOSE = "]";
const BRACKET_OPEN = "[";
const DOT = ".";
const EQUAL = "=";
const HASH = "#";
const QUOTE_SINGLE = "'";
const QUOTE_DOUBLE = '"';

/**
 * @typedef {Object.<string, any>} Attributes Attributes.
 */

/**
 * Converts a factory property name to an element type.
 *
 * @param {string} propertyName Factory property name.
 * @returns {string} Element type.
 */
export const propertyNameToType = (propertyName) =>
	propertyName[0].toLowerCase() +
	propertyName
		.substring(1)
		.replace(/([A-Z])/g, (capital) => `-${capital.toLowerCase()}`);

/**
 * Tokenize a selector into a type and its attributes.
 *
 * @param {string} selector Selector to tokenize.
 * @returns {[string, Attributes]} Node type and attributes.
 */
export const selectorToTokenizer = (selector) => {
	const length = selector.length;
	let i = 0;

	let type = "";
	/** @type {Attributes} */
	const attributes = {};

	let tokenA = "";
	let tokenB = true;
	let tokenType;
	/**
	 * Stores the current token based on its type into the attributes or type.
	 */
	const storeToken = () => {
		if (tokenA) {
			switch (tokenType) {
				case BRACKET_OPEN:
					attributes[tokenA] = tokenB === true ? true : tokenB;
					tokenB = true;
					break;

				case DOT:
					if (!attributes.class) {
						attributes.class = tokenA;
						break;
					}
					attributes.class += ` ${tokenA}`;
					break;

				case HASH:
					attributes.id = tokenA;
					break;

				default:
					type = tokenA;
					break;
			}
			tokenA = "";
		}
	};

	let character;

	let attributeBracketCount;
	/**
	 * Parses an attribute from the selector string, including its value if present.
	 */
	const parseAttribute = () => {
		attributeBracketCount = 0;

		while (i < length) {
			character = selector[i];
			i++;
			if (character === EQUAL) {
				// Parse attribute value.
				tokenB = "";
				character = selector[i];
				const endOnDoubleQuote = character === QUOTE_DOUBLE;
				const endOnSingleQuote = character === QUOTE_SINGLE;
				if (endOnDoubleQuote || endOnSingleQuote) {
					tokenB += character;
					i++;
				}

				while (i < length) {
					character = selector[i];
					if (
						(endOnDoubleQuote && character === QUOTE_DOUBLE) ||
						(endOnSingleQuote && character === QUOTE_SINGLE)
					) {
						tokenB += character;
						i++;
						break;
					} else if (
						!endOnDoubleQuote &&
						!endOnSingleQuote &&
						character === BRACKET_CLOSE
					) {
						break;
					}
					tokenB += character;
					i++;
				}

				if (
					(tokenB[0] === QUOTE_DOUBLE &&
						tokenB[tokenB.length - 1] === QUOTE_DOUBLE) ||
					(tokenB[0] === QUOTE_SINGLE &&
						tokenB[tokenB.length - 1] === QUOTE_SINGLE)
				) {
					tokenB = tokenB.substring(1, tokenB.length - 1);
				}

				// Consume until closing bracket, but don't store the tokens since these are invalid.
				while (i < length) {
					character = selector[i];
					i++;
					if (character === BRACKET_CLOSE) {
						break;
					}
				}
				break;
			} else if (character === BRACKET_OPEN) {
				attributeBracketCount++;
				continue;
			} else if (character === BRACKET_CLOSE) {
				attributeBracketCount--;
				if (attributeBracketCount < 0) {
					break;
				}
				continue;
			}

			tokenA += character;
		}
		storeToken();
	};

	while (i < length) {
		character = selector[i];
		i++;

		if (character === HASH) {
			storeToken();
			tokenType = HASH;
			continue;
		} else if (character === DOT) {
			storeToken();
			tokenType = DOT;
			continue;
		} else if (character === BRACKET_OPEN) {
			storeToken();
			tokenType = BRACKET_OPEN;
			parseAttribute();
			continue;
		}

		tokenA += character;
	}

	storeToken();

	return [type, attributes];
};
