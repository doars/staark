/**
 * Converts a base64-encoded string to an ArrayBuffer.
 *
 * @param {string} base64 - The base64-encoded string to convert.
 * @returns {ArrayBuffer} The decoded ArrayBuffer.
 */
export const base64ToBuffer = (base64) =>
	Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer;

/**
 * Converts a base64-encoded string to a UTF-8 string.
 *
 * @param {string} base64 - The base64-encoded string to convert.
 * @returns {string} The decoded UTF-8 string.
 */
export const base64ToString = (base64) =>
	new TextDecoder().decode(base64ToBuffer(base64));

/**
 * Converts an ArrayBuffer to a base64-encoded string.
 *
 * @param {ArrayBuffer} buffer - The ArrayBuffer to encode.
 * @returns {string} The base64-encoded string.
 */
export const bufferToBase64 = (buffer) => {
	const bytes = new Uint8Array(buffer);
	// Convert in chunks, since spreading too many arguments overflows the stack.
	let binary = "";
	for (let i = 0; i < bytes.length; i += 65536) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 65536));
	}
	return btoa(binary);
};

/**
 * Converts a UTF-8 string to a base64-encoded string.
 *
 * @param {string} string - The UTF-8 string to encode.
 * @returns {string} The base64-encoded string.
 */
export const stringToBase64 = (string) =>
	bufferToBase64(new TextEncoder().encode(string));
