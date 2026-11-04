/**
 * Normalize the content type by removing any parameters and converting to lowercase.
 *
 * @param {string} contentType The content type to normalize.
 * @returns {string} The normalized content type.
 */
const normalizeContentType = (contentType) =>
	contentType.split(";")[0].trim().toLowerCase();

/**
 * Get the type of the resource based on the URL, response headers, and request headers.
 *
 * @param {string} url The URL of the resource.
 * @param {Headers} responseHeaders The response headers.
 * @param {Headers} requestHeaders The request headers.
 * @returns {string} The type of the resource.
 */
export const getType = (url, responseHeaders, requestHeaders) => {
	// Check Content-Type in response headers.
	const contentType = responseHeaders.get("Content-Type");
	if (contentType) {
		return normalizeContentType(contentType);
	}

	// Check Accept in request headers.
	const accept = requestHeaders.get("Accept");
	if (accept) {
		for (const type of accept.split(",")) {
			if (type.trim() !== "*/*") {
				return normalizeContentType(type);
			}
		}
	}

	// Check URL extension.
	const match = url.match(/\.([^./?#]+)(?:[?#]|$)/);
	return match ? match[1].toLowerCase() : "";
};
