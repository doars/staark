import {
	SERVER_PAYLOAD,
	USER_DIRECT_PAYLOAD,
} from "../library/payload-keys.js";

const DELIMITER = "|";
const INFIX = ":";

/**
 * Encodes message parts into a protocol message. Only the server and direct payloads carry serialized text, so only those are base64-encoded. The other values are base64 already, or identifiers and numbers, and are sent as they are.
 *
 * @param {Object<string, any>} parts - The message parts.
 * @param {Function} stringToBase64 - Converts a string to base64.
 * @returns {string} The protocol message.
 */
export const encode = (parts, stringToBase64) => {
	const segments = [];
	for (const key of Object.keys(parts)) {
		let value = parts[key];
		if (value !== null && value !== undefined) {
			value = String(value);
			if (key === SERVER_PAYLOAD || key === USER_DIRECT_PAYLOAD) {
				value = stringToBase64(value);
			} else if (value.includes(DELIMITER) || value.includes(INFIX)) {
				throw new TypeError("protocol_invalid_value");
			}
			segments.push(key + INFIX + value);
		}
	}
	return segments.join(DELIMITER);
};

/**
 * Decodes a protocol message into its parts. Base64-decodes the server and direct payloads, and returns the other values as they are.
 *
 * @param {string} message - The protocol message.
 * @param {Function} base64ToString - Converts base64 to a string.
 * @param {Object<string, any>} [options={}] - Allowed keys and size limits.
 * @returns {Object<string, string>} The message parts, in a record without a prototype.
 */
export const decode = (message, base64ToString, options = {}) => {
	if (typeof message !== "string") {
		throw new TypeError("protocol_message_not_string");
	}
	const {
		allowedKeys,
		maxDecodedFieldBytes = Infinity,
		maxKeyBytes = Infinity,
		maxSegments = Infinity,
		maxTotalDecodedBytes = Infinity,
	} = options;
	const parts = Object.create(null);
	const segments = message.split(DELIMITER);
	if (segments.length > maxSegments) {
		throw new RangeError("protocol_too_many_segments");
	}
	let totalDecodedBytes = 0;
	for (const segment of segments) {
		const index = segment.indexOf(INFIX);
		if (index <= 0) {
			throw new TypeError("protocol_missing_separator");
		}
		const key = segment.substring(0, index);
		const value = segment.substring(index + 1);
		if (new TextEncoder().encode(key).byteLength > maxKeyBytes) {
			throw new RangeError("protocol_key_too_large");
		}
		if (allowedKeys && !allowedKeys.has(key)) {
			throw new TypeError("protocol_unknown_key");
		}
		if (Object.hasOwn(parts, key)) {
			throw new TypeError("protocol_duplicate_key");
		}
		const encoded = key === SERVER_PAYLOAD || key === USER_DIRECT_PAYLOAD;
		if (
			encoded &&
			(value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
		) {
			throw new TypeError("protocol_invalid_base64");
		}
		if (
			value.length >
			(encoded ? Math.ceil(maxDecodedFieldBytes / 3) * 4 : maxDecodedFieldBytes)
		) {
			throw new RangeError("protocol_field_too_large");
		}
		const decodedValue = encoded ? base64ToString(value) : value;
		const decodedBytes = new TextEncoder().encode(decodedValue).byteLength;
		if (decodedBytes > maxDecodedFieldBytes) {
			throw new RangeError("protocol_field_too_large");
		}
		totalDecodedBytes += decodedBytes;
		if (totalDecodedBytes > maxTotalDecodedBytes) {
			throw new RangeError("protocol_message_too_large");
		}
		parts[key] = decodedValue;
	}
	return parts;
};
