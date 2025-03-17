/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} CsvOptions
 * @property {string[]} [types]
 * @property {boolean} [hasHeaders]
 * @property {string} [columnDelimiter]
 * @property {string} [rowDelimiter]
 * @property {string} [escapeCharacter]
 */

const tsvTypes = [
  'tsv',
  'text/tab-separated-values',
]

/**
 * @param {CsvOptions} options
 * @returns {ResponseParser}
 */
export const csvParser = (options) => {
  return {
    types: options?.types || [
      'csv', 'text/csv',
      ...tsvTypes,
    ],

    /**
     * @param {Response} response
     * @param {RequestOptions} requestOptions
     * @param {string} type
     * @returns {Promise<any>}
     */
    parser: async (
      response,
      requestOptions,
      type,
    ) => {
      const optionsTemp = {
        columnDelimiter: (
          tsvTypes.includes(type)
            ? '	'
            : ','
        ),
        rowDelimiter: '\n',
        escapeCharacter: '"',

        ...options,
      }

      const string = await response.text()

      const rows = []
      let currentRow = []
      let currentField = ''
      let insideQuotes = false

      for (let i = 0; i < string.length; i++) {
        const character = string[i]
        const nextCharacter = string[i + 1]

        if (character === optionsTemp.escapeCharacter) {
          if (
            nextCharacter === optionsTemp.escapeCharacter
            && insideQuotes
          ) {
            // Double quotes inside quotes.
            currentField += optionsTemp.escapeCharacter
            i++ // Skip next quote.
          } else {
            // Toggle insideQuotes.
            insideQuotes = !insideQuotes
          }
        } else if (
          character === optionsTemp.columnDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField,
          )
          currentField = ''
        } else if (
          character === optionsTemp.rowDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField,
          )
          currentField = ''

          rows.push(currentRow)
          currentRow = []
        } else {
          currentField += character
        }
      }

      // Push the last field and row if there's any.
      if (currentField) {
        currentRow.push(
          currentField,
        )
        currentField = ''
      }
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }

      if (optionsTemp.hasHeaders) {
        // Extract headers and create objects.
        const headers = rows[0]
        return rows.slice(1).map(row => {
          return headers.reduce((
            object,
            header,
            index,
          ) => {
            object[header] = row[index] || ''
            return object
          }, {})
        })
      }

      return rows
    }
  }
}
