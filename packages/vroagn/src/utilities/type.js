/**
 * Normalize the content type by removing any parameters and converting to lowercase.
 * @param {string} contentType - The content type to normalize.
 * @returns {string} - The normalized content type.
 */
const normalizeContentType = (contentType) => contentType.split(';')[0].trim().toLowerCase()

/**
 * Extract the file extension from a URL.
 * @param {string} url - The URL to extract the file extension from.
 * @returns {string|null} - The file extension or null if not found.
 */
const getFileExtension = (
  url,
) => {
  const match = url.match(/\.([^./?]+)(?:[?#]|$)/)
  return match ? match[1].toLowerCase() : null
}

/**
 * Get the type of the resource based on the URL, response headers, and request headers.
 * @param {string} url - The URL of the resource.
 * @param {Headers} responseHeaders - The response headers.
 * @param {Record<string, string>} [requestHeaders] - The request headers.
 * @returns {string} - The type of the resource.
 */
export const getType = (
  url,
  responseHeaders,
  requestHeaders,
) => {
  // Check Content-Type in response headers.
  const contentType = responseHeaders.get('Content-Type')
  if (contentType) {
    return normalizeContentType(contentType)
  }

  // Check Accept in request headers.
  if (requestHeaders) {
    if (requestHeaders['Accept']) {
      const acceptTypes = requestHeaders['Accept'].split(',')
      for (const type of acceptTypes) {
        if (type.trim() !== '*/*') {
          return normalizeContentType(type)
        }
      }
    }
  }

  // Check URL extension.
  const extension = getFileExtension(url)
  if (extension) {
    return extension
  }

  return ''
}
