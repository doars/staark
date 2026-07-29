const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validate a key used by an object-producing parser.
 *
 * @param {unknown} key Key to validate.
 * @returns {string} Validated key.
 * @throws {TypeError} When the key can affect object prototypes.
 */
export const validateKey = (key) => {
	if (typeof key !== "string" || FORBIDDEN_KEYS.has(key.trim())) {
		throw new TypeError(`Unsafe parser key: ${String(key)}`);
	}
	return key;
};

/**
 * Create a parser-owned record without inherited setters.
 *
 * @returns {Record<string, any>} Safe record.
 */
export const createRecord = () => Object.create(null);
