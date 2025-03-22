/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} CsvOptions Options for the CSV parser.
 * @property {string[]} [types] MIME types to parse as CSV.
 * @property {boolean} [hasHeaders] Whether the CSV has headers.
 * @property {string} [columnDelimiter] The column delimiter.
 * @property {string} [rowDelimiter] The row delimiter.
 * @property {string} [escapeCharacter] The escape character.
 */

const tsvTypes = [
  'tsv',
  'text/tab-separated-values',
]

/**
 * CSV parser.
 *
 * @param {CsvOptions} options Options for the CSV parser.
 * @returns {ResponseParser} A response parser.
 */
export const csvParser = (
  options,
) => {
  return {
    types: options?.types || [
      'csv', 'text/csv',
      ...tsvTypes,
    ],

    /**
     * Parse the response as CSV.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<any>} The parsed response.
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
