const normalizeContentType = (
  contentType: string,
): string => contentType.split(';')[0].trim().toLowerCase()

const getFileExtension = (
  url: string,
): string | null => {
  const match = url.match(/\.([^./?]+)(?:[?#]|$)/)
  return match ? match[1].toLowerCase() : null
}

export const getType = function (
  url: string,
  responseHeaders: Headers,
  requestHeaders?: Record<string, string>,
): string {
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
