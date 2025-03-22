/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} IniOptions Options for the INI parser.
 * @property {string[]} [types] The types that should be parsed as INI.
 */

/**
 * @typedef {Object} IniObject The parsed INI object.
 * @property {Object.<string, Object.<string, string>>} IniObject The parsed INI object.
 */

/**
 * INI parser.
 *
 * @param {IniOptions} [options={}] Options for the INI parser.
 * @returns {ResponseParser} The INI parser.
 */
export const iniParser = (
  options = {},
) => {
  return {
    types: options.types || ['ini'],

    /**
     * Parse the response as an INI object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<IniObject>} The parsed INI object.
     */
    parser: async (
      response,
      requestOptions,
      type,
    ) => {
      const text = await response.text()

      const result = {}
      const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())

      let currentSection = ''
      for (const line of lines) {
        if (
          line === ''
          || line.startsWith(';')
          || line.startsWith('#')
        ) {
          // Skip empty lines and comments.
          continue
        }

        if (
          line.startsWith('[')
          && line.endsWith(']')
        ) {
          // New section.
          currentSection = line.slice(1, -1).trim()
          if (!result[currentSection]) {
            result[currentSection] = {}
          }
        } else {
          // Key-value pair.
          const [key, ...valueParts] = line.split('=')
          const value = valueParts.join('=').trim()

          if (currentSection === '') {
            // Global section (outside any named section).
            if (!result['global']) {
              result['global'] = {}
            }
            result['global'][key.trim()] = value
          } else {
            result[currentSection][key.trim()] = value
          }
        }
      }

      return result
    }
  }
}
