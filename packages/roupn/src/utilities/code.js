/**
 * A string containing the allowed characters for generating identifiers.
 * @type {string}
 */
export const ALPHANUMERIC_CHARACTERS =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * A string containing the allowed characters for generating codes. Excludes easily confused characters such as 'I', 'O', 'L', '1', and '0'.
 * @type {string}
 */
export const IDENTIFIABLE_CHARACTERS = "ABCDEFGHKMNPQRSTUVWXYZ23456789";

/**
 * Generates a random code string of the specified length.
 *
 * @param {number} [length=6] - The length of the code to generate.
 * @param {string} [characters='ABCDEFGHKMNPQRSTUVWXYZ23456789'] - The characters the code can consist of.
 * @returns {string} A randomly generated code.
 */
export const generateCode = (
	length = 24,
	characters = ALPHANUMERIC_CHARACTERS,
) => {
	if (!Number.isInteger(length) || length <= 0) {
		throw new TypeError("Code length must be a positive integer");
	}
	if (
		typeof characters !== "string" ||
		characters.length < 2 ||
		characters.length > 256
	) {
		throw new TypeError(
			"Code characters must contain between 2 and 256 values",
		);
	}

	const maximumByte = Math.floor(256 / characters.length) * characters.length;
	let code = "";
	while (code.length < length) {
		const bytes = new Uint8Array(Math.max(16, length - code.length));
		globalThis.crypto.getRandomValues(bytes);
		for (const byte of bytes) {
			if (byte < maximumByte) {
				code += characters[byte % characters.length];
				if (code.length === length) {
					break;
				}
			}
		}
	}
	return code;
};
