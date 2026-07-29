const DELIMITER = "|";
const INFIX = ":";

export const encode = (parts, stringToBase64) => {
	const segments = [];
	for (const key of Object.keys(parts)) {
		const value = parts[key];
		if (value !== null && value !== undefined) {
			segments.push(key + INFIX + stringToBase64(String(value)));
		}
	}
	return segments.join(DELIMITER);
};

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
		if (
			!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
				value,
			)
		) {
			throw new TypeError("protocol_invalid_base64");
		}
		const maximumEncodedLength = Math.ceil(maxDecodedFieldBytes / 3) * 4;
		if (value.length > maximumEncodedLength) {
			throw new RangeError("protocol_field_too_large");
		}
		const decodedValue = base64ToString(value);
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
