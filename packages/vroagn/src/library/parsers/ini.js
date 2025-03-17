/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} IniOptions
 * @property {string[]} [types]
 */

/**
 * @typedef {Object} IniObject
 * @property {Object.<string, Object.<string, string>>} IniObject
 */

/**
 * @param {IniOptions} [options={}]
 * @returns {ResponseParser}
 */
export const iniParser = (
  options = {},
) => {
  return {
    types: options.types || ['ini'],

    /**
     * @param {Response} response
     * @param {RequestOptions} requestOptions
     * @returns {Promise<IniObject>}
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
